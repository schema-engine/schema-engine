import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { userEvent } from 'vitest/browser';
import { FormController } from '@/adapters/radiant/controller';
import { containerOf } from './mount-field';
import type { FormSubmitContext } from '@/adapters/types';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { FORM_ROOT, type FormIssueFormatter } from '@schema-engine/forms/state-container';

const engineText: FormIssueFormatter = (issue, { path }) => `engine:${path}:${issue.source}:${issue.type}`;
const engine = createRadiantFormEngine({ elements: schemaFormRegistrations, formatIssue: engineText });
const gate = { hold: false, pending: [] as Array<() => void>, status: 200 };

beforeEach(() => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => {
			if (gate.hold) await new Promise<void>((resolve) => gate.pending.push(resolve));
			return new Response(JSON.stringify({ valid: true }), { status: gate.status });
		}),
	);
});

afterEach(() => {
	gate.hold = false;
	gate.status = 200;
	for (const release of gate.pending.splice(0)) release();
	vi.unstubAllGlobals();
	document.body.replaceChildren();
});

const settle = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

type RenderProps = Omit<Parameters<typeof FormRenderer>[0], 'config' | 'engine'>;

async function mount(
	elements: Record<string, unknown>[],
	props: RenderProps = {},
	extra: Record<string, unknown> = {},
) {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	const make = (els: Record<string, unknown>[] = elements, id = 'submission') =>
		engine.validateForm({ id, steps: [{ id: 'main', title: 'Main', elements: els }], ...extra });
	const onSubmit = props.onSubmit ?? vi.fn();
	const config = make();
	const render = (next = config, nextProps: RenderProps = props) =>
		root.render(FormRenderer({ ...nextProps, onSubmit, config: next, engine }));
	render();
	const ruiForm = host.querySelector('rui-form')!;
	const form = new FormController(ruiForm);
	await expect.poll(() => form.container).toBeTruthy();
	const instance = host.querySelector('se-form-instance')!;
	const completed = vi.fn();
	ruiForm.addEventListener('se-action-submit-complete', completed);
	return {
		host,
		ruiForm,
		form,
		container: containerOf(ruiForm),
		instance,
		onSubmit: vi.mocked(onSubmit),
		completed,
		make,
		render,
		config,
	};
}

const checked = {
	$type: 'input',
	id: 'name',
	name: 'name',
	rules: [{ type: 'async', url: '/check', disableCache: true }],
};

const submit = (host: HTMLElement) => host.querySelector('form')!.requestSubmit();

test('a submission a reset outran submits nothing and is not an attempt', async () => {
	const { host, container, instance, onSubmit, completed } = await mount([checked]);
	await userEvent.fill(host.querySelector('input')!, 'Ada');
	gate.hold = true;
	submit(host);
	await expect.poll(() => Object.keys(container.getSnapshot().validating).length > 0).toBe(true);

	container.reset();
	gate.hold = false;
	for (const release of gate.pending.splice(0)) release();
	await settle(100);

	expect(onSubmit).not.toHaveBeenCalled();
	expect(completed).not.toHaveBeenCalled();
	expect(instance.getContextValue().submitCount).toBe(0);
});

test('a submission outrun by edits again and again submits nothing', async () => {
	const { host, container, onSubmit, completed } = await mount([checked]);
	const input = host.querySelector('input')!;
	await userEvent.fill(input, 'Ada');
	gate.hold = true;
	submit(host);
	await expect.poll(() => Object.keys(container.getSnapshot().validating).length > 0).toBe(true);

	for (const edit of ['Ada L', 'Ada Lo', 'Ada Lov']) {
		await userEvent.fill(input, edit);
		for (const release of gate.pending.splice(0)) release();
		await settle(80);
	}
	gate.hold = false;
	for (const release of gate.pending.splice(0)) release();
	await settle(100);

	expect(completed.mock.calls.length).toBeLessThanOrEqual(1);
	for (const [call] of onSubmit.mock.calls) expect(call).toMatchObject({ name: 'Ada Lov' });
});

test('a validator that cannot run completes the submission unsuccessfully with its failure, and is an attempt', async () => {
	const { host, container, instance, onSubmit, completed } = await mount([checked]);
	await userEvent.fill(host.querySelector('input')!, 'Ada');
	gate.status = 500;
	const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

	submit(host);
	await expect.poll(() => completed.mock.calls.length).toBe(1);

	const [event] = completed.mock.calls[0] ?? [];
	expect(event).toBeInstanceOf(CustomEvent);
	expect(event instanceof CustomEvent && event.detail).toMatchObject({ succeeded: false, error: expect.anything() });
	expect(instance.getContextValue().submitCount).toBe(1);
	expect(onSubmit).not.toHaveBeenCalled();
	expect(container.getSnapshot().errors).toEqual({});
	logged.mockRestore();
});

test('an invalid submission counts, reports itself and focuses the first invalid field in document order', async () => {
	const required = [{ type: 'required', message: 'Required' }];
	const { host, ruiForm, instance, onSubmit } = await mount([
		{ $type: 'input', id: 'first', name: 'first', label: 'First' },
		{ $type: 'input', id: 'second', name: 'second', label: 'Second', rules: required },
		{ $type: 'input', id: 'third', name: 'third', label: 'Third', rules: required },
	]);
	const invalid = vi.fn();
	ruiForm.addEventListener('se-action-submit-invalid', invalid);

	submit(host);

	await expect.poll(() => invalid.mock.calls.length).toBe(1);
	expect(instance.getContextValue().submitCount).toBe(1);
	expect(onSubmit).not.toHaveBeenCalled();
	await expect.poll(() => document.activeElement?.closest('se-field')?.getAttribute('name')).toBe('second');
});

test('a config replaced while a submission validates does not submit the old values into the new form', async () => {
	const { host, container, make, render, onSubmit, instance } = await mount([checked]);
	await userEvent.fill(host.querySelector('input')!, 'Old');
	gate.hold = true;
	submit(host);
	await expect.poll(() => Object.keys(container.getSnapshot().validating).length > 0).toBe(true);

	render(make([checked], 'replaced'));
	await expect.poll(() => instance.config.id).toBe('replaced');
	gate.hold = false;
	for (let round = 0; round < 3; round += 1) {
		for (const release of gate.pending.splice(0)) release();
		await settle(60);
	}

	expect(onSubmit).not.toHaveBeenCalled();
	expect(instance.getContextValue().submitCount).toBe(0);
});

test('a validation hung on an old form does not hold back the next form', async () => {
	const { host, container, make, render, onSubmit, instance } = await mount([checked]);
	await userEvent.fill(host.querySelector('input')!, 'Old');
	gate.hold = true;
	submit(host);
	await expect.poll(() => Object.keys(container.getSnapshot().validating).length > 0).toBe(true);

	render(make([{ $type: 'input', id: 'plain', name: 'plain' }], 'next'));
	await expect.poll(() => instance.config.id).toBe('next');
	await expect.poll(() => containerOf(host.querySelector('rui-form')!).getSnapshot().values).toEqual({});
	submit(host);

	await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
});

test('moving the instance keeps its form, and the controls still write to it', async () => {
	const { host, container, instance } = await mount([
		{ $type: 'input', id: 'name', name: 'name', rules: [{ type: 'required', message: 'Required' }] },
	]);
	await userEvent.fill(host.querySelector('input')!, 'Ada');
	container.blur('name');
	instance.markStepVisited(0);
	const other = document.createElement('section');
	document.body.append(other);

	other.append(instance);
	await settle();

	const moved = new FormController(other.querySelector('rui-form')!);
	expect(moved.container).toBe(container);
	expect(container.getSnapshot().touched['name']).toBe(true);
	expect(instance.stepStates.visited[0]).toBe(true);
	await userEvent.fill(other.querySelector('input')!, 'Grace');
	await expect.poll(() => container.getSnapshot().values['name']).toBe('Grace');
	container.setValue('name', 'Linus');
	await expect.poll(() => other.querySelector('input')!.value).toBe('Linus');
});

test('reset restores the defaults, and clears touched, errors and dirty', async () => {
	const { host, container } = await mount([
		{ $type: 'input', id: 'name', name: 'name', defaultValue: 'D', rules: [{ type: 'minLength', value: 5 }] },
	]);
	container.setValue('name', 'abc');
	container.blur('name');
	await container.validate();
	expect(container.getSnapshot().touched['name']).toBe(true);
	expect(container.getSnapshot().errors['name']).toBeDefined();

	host.querySelector('form')!.reset();
	await settle(60);

	expect(container.getSnapshot().values['name']).toBe('D');
	expect(host.querySelector('input')!.value).toBe('D');
	expect(container.getSnapshot().touched).toEqual({});
	expect(container.getSnapshot().errors).toEqual({});
	expect(container.getSnapshot().dirty).toEqual({});
});

test('new default values with the same config start a fresh form', async () => {
	const { host, form, config, render } = await mount([{ $type: 'input', id: 'name', name: 'name', label: 'Name' }], {
		defaultValues: { name: 'A' },
	});
	const first = form.container;
	expect(first?.getSnapshot().values['name']).toBe('A');

	render(config, { defaultValues: { name: 'B' } });

	await expect.poll(() => new FormController(host.querySelector('rui-form')!).container).not.toBe(first);
	const next = new FormController(host.querySelector('rui-form')!).container;
	expect(next?.getSnapshot().values['name']).toBe('B');
	await expect.poll(() => host.querySelector('input')!.value).toBe('B');
});

test('a native fact of an engine-rendered input reaches the container and the page', async () => {
	const { host, container } = await mount(
		[{ $type: 'input', id: 'email', name: 'email', label: 'Email', inputType: 'email' }],
		{},
		{ validationMode: 'onBlur' },
	);
	const input = host.querySelector('input')!;

	await userEvent.fill(input, 'abc');
	await userEvent.tab();

	await expect
		.poll(() =>
			container
				.getSnapshot()
				.errors['email']?.all.some(({ source, type }) => source === 'native' && type === 'typeMismatch'),
		)
		.toBe(true);
	await expect.poll(() => host.textContent).toContain('engine:email:native:typeMismatch');
	expect(await container.validate()).toBe(false);
	await userEvent.fill(input, 'a@b.co');
	await userEvent.tab();
	await expect.poll(() => container.getSnapshot().errors['email']).toBeUndefined();
});

test("the formatter is the renderer's, else the engine's, and changing it refreshes the text", async () => {
	const { host, container } = await mount([
		{ $type: 'input', id: 'name', name: 'name', label: 'Name', rules: [{ type: 'required' }] },
	]);
	await container.validate();
	await expect.poll(() => host.textContent).toContain('engine:name:validation:required');

	const renderer = host.querySelector('se-form-renderer')!;
	renderer.formatIssue = (_issue, { path }) => `renderer:${path}`;
	await expect.poll(() => host.textContent).toContain('renderer:name');
	expect(host.textContent).not.toContain('engine:name');

	renderer.formatIssue = undefined;
	await expect.poll(() => host.textContent).toContain('engine:name:validation:required');
});

test('the container starts from the hydration the server serialized, and only for the first form of a server-rendered instance', async () => {
	const config = engine.validateForm({
		id: 'rows',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'arrayElements',
						id: 'contacts',
						name: 'contacts',
						elements: [
							{ $type: 'input', id: 'email', name: 'email' },
							{ $type: 'input', id: 'role', name: 'role' },
						],
					},
				],
			},
		],
	});
	const defaultValues = { contacts: [{ email: 'a' }, { email: 'b' }] };
	const build = (serverRendered: boolean) => {
		const instance = document.createElement('se-form-instance');
		if (serverRendered) instance.setAttribute('data-radiant-ssr', '');
		instance.engine = engine;
		instance.config = config;
		instance.defaultValues = defaultValues;
		instance.hydration = { values: defaultValues, rowIds: { contacts: ['server-a', 'server-b'] } };
		const ruiForm = document.createElement('rui-form');
		instance.append(ruiForm);
		document.body.append(instance);
		return { instance, ruiForm };
	};

	const hydrated = build(true);
	await expect.poll(() => new FormController(hydrated.ruiForm).container).toBeTruthy();
	const container = containerOf(hydrated.ruiForm);
	expect(container.getSnapshot().rowIds['contacts']).toEqual(['server-a', 'server-b']);
	container.fieldArray('contacts').append({ email: 'c' });
	expect(new Set(container.getSnapshot().rowIds['contacts']).size).toBe(3);

	hydrated.instance.config = engine.validateForm({ ...config, id: 'rows-next' });
	await expect.poll(() => new FormController(hydrated.ruiForm).container).not.toBe(container);
	expect(containerOf(hydrated.ruiForm).getSnapshot().rowIds['contacts']).not.toEqual(['server-a', 'server-b']);

	const client = build(false);
	await expect.poll(() => new FormController(client.ruiForm).container).toBeTruthy();
	expect(containerOf(client.ruiForm).getSnapshot().rowIds['contacts']).not.toEqual(['server-a', 'server-b']);
});

test('onSubmit receives the values that passed, the server-errors setter and the engine fetch', async () => {
	const onSubmit = vi.fn(async (_values: Record<string, unknown>, context: FormSubmitContext) => {
		context.setServerErrors({ name: { type: 'taken' }, [FORM_ROOT]: { message: 'Try later' } });
	});
	const { host, container, completed } = await mount([{ $type: 'input', id: 'name', name: 'name', label: 'Name' }], {
		onSubmit,
	});
	await userEvent.fill(host.querySelector('input')!, 'Ada');

	submit(host);
	await expect.poll(() => completed.mock.calls.length).toBe(1);

	const [values, context] = onSubmit.mock.calls[0] ?? [];
	expect(values).toEqual({ name: 'Ada' });
	expect(context?.fetch).toBe(engine.fetch);
	expect(container.getSnapshot().errors['name']?.type).toBe('taken');
	expect(container.getSnapshot().errors[FORM_ROOT]?.message).toBe('Try later');
});

describe('a native post and the CSRF field of the engine policy', () => {
	let token: string | undefined = 'first';
	const csrfEngine = createRadiantFormEngine({
		elements: schemaFormRegistrations,
		csrf: { token: () => token, header: 'x-csrf', field: '_csrf' },
	});

	async function mountPost(native: { action?: string; method?: string }) {
		const host = document.createElement('div');
		document.body.append(host);
		const config = csrfEngine.validateForm({
			id: 'post',
			steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'input', id: 'name', name: 'name' }] }],
		});
		const render = (next: typeof native) =>
			createRoot(host).render(FormRenderer({ config, engine: csrfEngine, ...next }));
		render(native);
		const ruiForm = host.querySelector('rui-form')!;
		await expect.poll(() => new FormController(ruiForm).container).toBeTruthy();
		const nativeForm = host.querySelector('form')!;
		const post = vi.spyOn(nativeForm, 'submit').mockImplementation(() => {});
		const posted = async () => {
			const before = post.mock.calls.length;
			nativeForm.requestSubmit();
			await expect.poll(() => post.mock.calls.length).toBe(before + 1);
		};
		const field = () => nativeForm.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="_csrf"]');
		return { ruiForm, nativeForm, posted, field };
	}

	beforeEach(() => {
		token = 'first';
	});

	test('a same-origin post gets the current token, once, and the inner form has the real action and method', async () => {
		const { nativeForm, posted, field } = await mountPost({ action: '/save', method: 'post' });
		expect(nativeForm.getAttribute('action')).toBe('/save');
		expect(nativeForm.method).toBe('post');

		await posted();
		expect(field()).toHaveLength(1);
		expect(field()[0]?.value).toBe('first');

		token = 'second';
		await posted();
		expect(field()).toHaveLength(1);
		expect(field()[0]?.value).toBe('second');
	});

	test('a cross-origin action gets no token', async () => {
		const { nativeForm, posted, field } = await mountPost({
			action: 'https://elsewhere.test/save',
			method: 'post',
		});
		expect(nativeForm.getAttribute('action')).toBe('https://elsewhere.test/save');

		await posted();
		expect(field()).toHaveLength(0);
	});

	test('a GET form gets no token', async () => {
		const { nativeForm, posted, field } = await mountPost({ action: '/search', method: 'get' });
		expect(nativeForm.method).toBe('get');

		await posted();
		expect(field()).toHaveLength(0);
	});

	test('a token an earlier post left is removed when the next post must not carry it', async () => {
		const { ruiForm, posted, field } = await mountPost({ action: '/save', method: 'post' });
		await posted();
		expect(field()).toHaveLength(1);

		ruiForm.setAttribute('action', 'https://elsewhere.test/save');
		await expect
			.poll(() => ruiForm.querySelector('form')?.getAttribute('action'))
			.toBe('https://elsewhere.test/save');
		await posted();
		expect(field()).toHaveLength(0);
	});
});
