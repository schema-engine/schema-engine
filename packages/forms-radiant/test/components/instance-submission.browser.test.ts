import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { userEvent } from 'vitest/browser';
import { FormController } from '@/adapters/radiant/controller';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import type { FormIssueFormatter } from '@schema-engine/forms/state-container';

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
	await expect.poll(() => form.ready).toBe(true);
	const instance = host.querySelector('se-form-instance')!;
	const completed = vi.fn();
	ruiForm.addEventListener('se-action-submit-complete', completed);
	return { host, ruiForm, form, instance, onSubmit: vi.mocked(onSubmit), completed, make, render, config };
}

const checked = {
	$type: 'input',
	id: 'name',
	name: 'name',
	rules: [{ type: 'async', url: '/check', disableCache: true }],
};

const submit = (host: HTMLElement) => host.querySelector('form')!.requestSubmit();

test('a submission a reset outran submits nothing and is not an attempt', async () => {
	const { host, form, instance, onSubmit, completed } = await mount([checked]);
	await userEvent.fill(host.querySelector('input')!, 'Ada');
	gate.hold = true;
	submit(host);
	await expect.poll(() => form.formState.isValidating).toBe(true);

	form.reset();
	gate.hold = false;
	for (const release of gate.pending.splice(0)) release();
	await settle(100);

	expect(onSubmit).not.toHaveBeenCalled();
	expect(completed).not.toHaveBeenCalled();
	expect(instance.getContextValue().submitCount).toBe(0);
});

test('a submission outrun by edits again and again submits nothing', async () => {
	const { host, form, onSubmit, completed } = await mount([checked]);
	const input = host.querySelector('input')!;
	await userEvent.fill(input, 'Ada');
	gate.hold = true;
	submit(host);
	await expect.poll(() => form.formState.isValidating).toBe(true);

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
	const { host, form, instance, onSubmit, completed } = await mount([checked]);
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
	expect(form.formState.errors).toEqual({});
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
	const { host, form, make, render, onSubmit, instance } = await mount([checked]);
	await userEvent.fill(host.querySelector('input')!, 'Old');
	gate.hold = true;
	submit(host);
	await expect.poll(() => form.formState.isValidating).toBe(true);

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
	const { host, form, make, render, onSubmit, instance } = await mount([checked]);
	await userEvent.fill(host.querySelector('input')!, 'Old');
	gate.hold = true;
	submit(host);
	await expect.poll(() => form.formState.isValidating).toBe(true);

	render(make([{ $type: 'input', id: 'plain', name: 'plain' }], 'next'));
	await expect.poll(() => instance.config.id).toBe('next');
	await expect.poll(() => new FormController(host.querySelector('rui-form')!).formState.values).toEqual({});
	submit(host);

	await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
});

test('moving the instance keeps its form, and the controls still write to it', async () => {
	const { host, form, instance } = await mount([
		{ $type: 'input', id: 'name', name: 'name', rules: [{ type: 'required', message: 'Required' }] },
	]);
	const container = form.container!;
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
	const { host, form } = await mount([
		{ $type: 'input', id: 'name', name: 'name', defaultValue: 'D', rules: [{ type: 'minLength', value: 5 }] },
	]);
	const container = form.container!;
	container.setValue('name', 'abc');
	container.blur('name');
	await form.trigger();
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
	expect(next?.getSnapshot().defaults['name']).toBe('B');
	await expect.poll(() => host.querySelector('input')!.value).toBe('B');
});

test('a native fact of an engine-rendered input reaches the container and the page', async () => {
	const { host, form } = await mount(
		[{ $type: 'input', id: 'email', name: 'email', label: 'Email', inputType: 'email' }],
		{},
		{ validationMode: 'onBlur' },
	);
	const input = host.querySelector('input')!;

	await userEvent.fill(input, 'abc');
	await userEvent.tab();

	await expect
		.poll(() =>
			form.formState.errors['email']?.all.some(
				({ source, type }) => source === 'native' && type === 'typeMismatch',
			),
		)
		.toBe(true);
	await expect.poll(() => host.textContent).toContain('engine:email:native:typeMismatch');
	expect(await form.trigger()).toBe(false);
	await userEvent.fill(input, 'a@b.co');
	await userEvent.tab();
	await expect.poll(() => form.formState.errors['email']).toBeUndefined();
});

test("the formatter is the instance's, else the renderer's, else the engine's, and changing it refreshes the text", async () => {
	const { host, form, instance } = await mount([
		{ $type: 'input', id: 'name', name: 'name', label: 'Name', rules: [{ type: 'required' }] },
	]);
	await form.trigger();
	await expect.poll(() => host.textContent).toContain('engine:name:validation:required');

	const renderer = host.querySelector('se-form-renderer')!;
	renderer.formatIssue = (_issue, { path }) => `renderer:${path}`;
	await expect.poll(() => host.textContent).toContain('renderer:name');
	expect(host.textContent).not.toContain('engine:name');

	instance.formatIssue = (_issue, { path }) => `instance:${path}`;
	await expect.poll(() => host.textContent).toContain('instance:name');
	expect(host.textContent).not.toContain('renderer:name');

	instance.formatIssue = undefined;
	renderer.formatIssue = undefined;
	await expect.poll(() => host.textContent).toContain('engine:name:validation:required');
});

test('the container adopts the row ids the hydrated server markup carries, and only then', async () => {
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
	const build = (serverRendered: boolean) => {
		const instance = document.createElement('se-form-instance');
		if (serverRendered) instance.setAttribute('data-radiant-ssr', '');
		instance.engine = engine;
		instance.config = config;
		instance.defaultValues = { contacts: [{ email: 'a' }, { email: 'b' }] };
		const array = document.createElement('se-form-array');
		array.config = {
			$type: 'arrayElements',
			id: 'contacts',
			name: 'contacts',
			elements: [],
			ssrRowIds: ['server-a', 'server-b'],
		};
		const ruiForm = document.createElement('rui-form');
		ruiForm.append(array);
		instance.append(ruiForm);
		document.body.append(instance);
		return { instance, ruiForm };
	};

	const hydrated = build(true);
	await expect.poll(() => new FormController(hydrated.ruiForm).ready).toBe(true);
	const { container } = new FormController(hydrated.ruiForm);
	expect(container?.getSnapshot().rowIds['contacts']).toEqual(['server-a', 'server-b']);
	container?.fieldArray('contacts').append({ email: 'c' });
	expect(new Set(container?.getSnapshot().rowIds['contacts']).size).toBe(3);

	hydrated.instance.config = engine.validateForm({ ...config, id: 'rows-next' });
	await expect.poll(() => new FormController(hydrated.ruiForm).container).not.toBe(container);
	const replaced = new FormController(hydrated.ruiForm).container;
	expect(replaced?.getSnapshot().rowIds['contacts']).not.toEqual(['server-a', 'server-b']);

	const client = build(false);
	await expect.poll(() => new FormController(client.ruiForm).ready).toBe(true);
	expect(new FormController(client.ruiForm).formState.rowIds['contacts']).not.toEqual(['server-a', 'server-b']);
});
