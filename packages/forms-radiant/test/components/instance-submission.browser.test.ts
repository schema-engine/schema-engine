import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { userEvent } from 'vitest/browser';
import { FormController } from '@/adapters/radiant/controller';
import { FormRenderer } from '@/components/internals/form-renderer';
import type { FormInstanceElement } from '@/components/form-instance.script';
import type { SeFormArray } from '@/elements/inputs/form-array-elements';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
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

async function mount(elements: Record<string, unknown>[], onSubmit = vi.fn()) {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	const config = engine.validateForm({ id: 'submission', steps: [{ id: 'main', title: 'Main', elements }] });
	root.render(FormRenderer({ config, engine, onSubmit }));
	const ruiForm = host.querySelector('rui-form')!;
	const form = new FormController(ruiForm);
	await expect.poll(() => form.ready).toBe(true);
	const instance = host.querySelector<FormInstanceElement>('se-form-instance')!;
	const completed = vi.fn();
	ruiForm.addEventListener('se-action-submit-complete', completed);
	return { host, ruiForm, form, instance, onSubmit, completed };
}

const checked = {
	$type: 'input',
	id: 'name',
	name: 'name',
	rules: [{ type: 'async', url: '/check', disableCache: true }],
};

test('a submission an edit or reset outran submits nothing and is not an attempt', async () => {
	const { host, form, instance, onSubmit, completed } = await mount([checked]);
	await userEvent.fill(host.querySelector('input')!, 'Ada');
	gate.hold = true;
	host.querySelector('form')!.requestSubmit();
	await expect.poll(() => form.formState.isValidating).toBe(true);

	form.reset();
	gate.hold = false;
	for (const release of gate.pending.splice(0)) release();
	await settle(100);

	expect(onSubmit).not.toHaveBeenCalled();
	expect(completed).not.toHaveBeenCalled();
	expect(instance.getContextValue().submitCount).toBe(0);
});

test('a validator that cannot run stops the submission without a field error', async () => {
	const { host, form, instance, onSubmit, completed } = await mount([checked]);
	await userEvent.fill(host.querySelector('input')!, 'Ada');
	gate.status = 500;
	const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

	host.querySelector('form')!.requestSubmit();
	await expect.poll(() => instance.getContextValue().submitCount).toBe(1);

	expect(onSubmit).not.toHaveBeenCalled();
	expect(completed).not.toHaveBeenCalled();
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

	host.querySelector('form')!.requestSubmit();

	await expect.poll(() => invalid.mock.calls.length).toBe(1);
	expect(instance.getContextValue().submitCount).toBe(1);
	expect(onSubmit).not.toHaveBeenCalled();
	await expect.poll(() => document.activeElement?.closest('se-field')?.getAttribute('name')).toBe('second');
});

test('moving the instance keeps its form: container, values, field state and step state', async () => {
	const { host, form, instance } = await mount([
		{ $type: 'input', id: 'name', name: 'name', rules: [{ type: 'required', message: 'Required' }] },
	]);
	const container = form.container!;
	container.setValue('name', 'Ada');
	container.blur('name');
	instance.markStepVisited(0);
	const parent = instance.parentElement!;

	parent.removeChild(instance);
	parent.append(instance);
	await settle();

	expect(new FormController(host.querySelector('rui-form')!).container).toBe(container);
	expect(container.getSnapshot().values['name']).toBe('Ada');
	expect(container.getSnapshot().touched['name']).toBe(true);
	expect(instance.stepStates.visited[0]).toBe(true);
});

test('reset clears touched and errors and restores the values', async () => {
	const { host, form } = await mount([
		{ $type: 'input', id: 'name', name: 'name', rules: [{ type: 'required', message: 'Required' }] },
	]);
	const container = form.container!;
	container.setValue('name', 'Ada');
	container.blur('name');
	container.setValue('name', '');
	await form.trigger();
	expect(container.getSnapshot().touched['name']).toBe(true);

	host.querySelector('form')!.reset();
	await settle(50);

	expect(container.getSnapshot().touched).toEqual({});
	expect(container.getSnapshot().errors).toEqual({});
	expect(container.getSnapshot().dirty).toEqual({});
});

test('the container adopts the row ids the server rendered when they differ from the ones it would mint', async () => {
	const host = document.createElement('div');
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
	const instance = document.createElement('se-form-instance') as FormInstanceElement;
	instance.engine = engine;
	instance.config = config;
	instance.defaultValues = { contacts: [{ email: 'a' }, { email: 'b' }] };
	const array = document.createElement('se-form-array') as SeFormArray;
	array.config = { ...config.steps[0].elements[0], ssrRowIds: ['server-a', 'server-b'] } as SeFormArray['config'];
	const ruiForm = document.createElement('rui-form');
	ruiForm.append(array);
	instance.append(ruiForm);
	host.append(instance);
	document.body.append(host);

	await expect.poll(() => new FormController(ruiForm).ready).toBe(true);
	const { container } = new FormController(ruiForm);

	expect(container?.getSnapshot().rowIds['contacts']).toEqual(['server-a', 'server-b']);
	container?.fieldArray('contacts').append({ email: 'c' });
	const ids = container?.getSnapshot().rowIds['contacts'] ?? [];
	expect(ids).toHaveLength(3);
	expect(new Set(ids).size).toBe(3);
});
