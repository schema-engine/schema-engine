import { afterEach, expect, test, vi } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { FormStore, type FieldValues } from '@ecopages/radiant-ui/form';
import { FormActionControllerElement } from '@/components/form-action-controller';
import { FormRendererElement } from '@/components/internals/form-renderer.script';
import { provideTestFormStore } from '../adapters/test-form';
import { testAction, type TestActionContext } from '../adapters/test-actions';

afterEach(() => document.body.replaceChildren());

test('submission action callback receives the successful action and nested values in lifecycle order', async () => {
	const events: string[] = [];
	const execute = vi.fn(async (_context: TestActionContext) => ({ success: true }));
	const engine = createFormEngine({ elements: [], actions: [testAction('submit', ['form_submit'], execute)] });
	const host = document.createElement('rui-form');
	const store = new FormStore<FieldValues>({ defaultValues: { 'address.street': 'Main' } });
	provideTestFormStore(host, store);
	const controller = new FormActionControllerElement();
	controller.engine = engine;
	controller.config = engine.defineForm({
		id: 'actions',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ id: 'save', $type: 'submit', endpoint: '/save' }],
	});
	controller.onAction = vi.fn(async () => {
		events.push('callback');
	});
	host.append(controller);
	document.body.append(host);
	await expect.poll(() => controller.form.ready).toBe(true);
	const ready = vi.spyOn(controller.form, 'ready', 'get').mockReturnValue(false);
	await expect(controller.submit()).resolves.toEqual({ succeeded: false, results: [] });
	expect(events).toEqual([]);
	ready.mockRestore();
	await expect(controller.submit()).resolves.toMatchObject({ succeeded: true });
	expect(events).toEqual(['callback']);
	expect(controller.onAction).toHaveBeenCalledTimes(1);
	expect(controller.onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'save' }), {
		address: { street: 'Main' },
	});
	expect(execute.mock.calls.at(-1)?.[0]).toMatchObject({
		trigger: 'form_submit',
		formData: { address: { street: 'Main' } },
	});
});

test('rebuilds the dispatcher when the form engine changes', async () => {
	const executeA = vi.fn(async () => ({ success: true }));
	const executeB = vi.fn(async () => ({ success: true }));
	const engineA = createFormEngine({ elements: [], actions: [testAction('submit', ['form_submit'], executeA)] });
	const engineB = createFormEngine({ elements: [], actions: [testAction('submit', ['form_submit'], executeB)] });
	const host = document.createElement('rui-form');
	provideTestFormStore(host, new FormStore());
	const controller = new FormActionControllerElement();
	controller.engine = engineA;
	controller.config = engineA.defineForm({
		id: 'engine-a',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ id: 'save-a', $type: 'submit', endpoint: '/save' }],
	});
	host.append(controller);
	document.body.append(host);
	await expect.poll(() => controller.form.ready).toBe(true);

	controller.engine = engineB;
	controller.config = engineB.defineForm({
		id: 'engine-b',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ id: 'save-b', $type: 'submit', endpoint: '/save' }],
	});
	await controller.submit();

	expect(executeA).not.toHaveBeenCalled();
	expect(executeB).toHaveBeenCalledOnce();
});

test('runs mount actions after the form engine changes', async () => {
	const executeA = vi.fn(async () => ({ success: true }));
	const executeB = vi.fn(async () => ({ success: true }));
	const engineA = createFormEngine({ elements: [], actions: [testAction('mount', ['form_mount'], executeA)] });
	const engineB = createFormEngine({ elements: [], actions: [testAction('mount', ['form_mount'], executeB)] });
	const host = document.createElement('rui-form');
	provideTestFormStore(host, new FormStore());
	const controller = new FormActionControllerElement();
	controller.engine = engineA;
	controller.config = engineA.defineForm({
		id: 'engine-a-mount',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ id: 'mount-a', $type: 'mount' }],
	});
	host.append(controller);
	document.body.append(host);
	await expect.poll(() => executeA.mock.calls.length).toBe(1);

	controller.engine = engineB;
	controller.config = engineB.defineForm({
		id: 'engine-b-mount',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ id: 'mount-b', $type: 'mount' }],
	});
	await expect.poll(() => executeB.mock.calls.length).toBe(1);
});

test('refreshes action context between submission triggers and keeps form operations stable', async () => {
	const observed: Array<{ trigger: string; formData: Record<string, unknown>; form: unknown }> = [];
	const engine = createFormEngine({
		elements: [],
		actions: [
			testAction('submit', ['form_submit_start', 'form_submit'], async ({ trigger, formData, form }) => {
				observed.push({ trigger, formData, form });
				if (trigger === 'form_submit_start') form.setValue('status', 'prepared');
				return { success: true };
			}),
		],
	});
	const host = document.createElement('rui-form');
	provideTestFormStore(host, new FormStore<FieldValues>({ defaultValues: { status: 'draft' } }));
	const controller = new FormActionControllerElement();
	controller.engine = engine;
	controller.config = engine.defineForm({
		id: 'fresh-submit-context',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ id: 'prepare', $type: 'submit', endpoint: '/save' }],
	});
	host.append(controller);
	document.body.append(host);
	await expect.poll(() => controller.form.ready).toBe(true);
	await controller.submit();

	expect(observed.map(({ trigger }) => trigger)).toEqual(['form_submit_start', 'form_submit']);
	expect(observed[1]?.formData).toEqual({ status: 'prepared' });
	expect(observed[1]?.form).toBe(observed[0]?.form);
});

test.each([false, true])(
	'a stopping failure settles the lifecycle (callback rejection: %s)',
	async (callbackRejects) => {
		const executed: string[] = [];
		const engine = createFormEngine({
			elements: [],
			actions: [
				testAction('submit', ['form_submit'], async ({ config }) => {
					executed.push(config.id);
					return callbackRejects ? { success: true } : { success: false, shouldContinue: false };
				}),
			],
		});
		const host = document.createElement('rui-form');
		provideTestFormStore(host, new FormStore());
		const controller = new FormActionControllerElement();
		controller.engine = engine;
		controller.config = engine.defineForm({
			id: 'failure',
			steps: [{ id: 'main', title: 'Main', elements: [] }],
			actions: [
				{ id: 'first', $type: 'submit', endpoint: '/save' },
				{ id: 'second', $type: 'submit', endpoint: '/save' },
			],
		});
		controller.onAction = vi.fn(async () => {
			throw new Error('callback failure');
		});
		host.append(controller);
		document.body.append(host);
		await expect.poll(() => controller.form.ready).toBe(true);
		const outcome = await controller.submit();
		expect(executed).toEqual(['first']);
		expect(controller.onAction).toHaveBeenCalledTimes(callbackRejects ? 1 : 0);
		expect(outcome).toEqual({
			succeeded: false,
			results: [expect.objectContaining({ actionId: 'first', success: false, shouldContinue: false })],
		});
	},
);

test('form_change actions keep running after the controller reconnects', async () => {
	const changes: unknown[] = [];
	const engine = createFormEngine({
		elements: [],
		actions: [
			testAction('change', ['form_change'], async ({ formData }) => {
				changes.push(formData.note);
				return { success: true };
			}),
		],
	});
	const host = document.createElement('rui-form');
	const store = new FormStore<FieldValues>({ defaultValues: { note: '' } });
	provideTestFormStore(host, store);
	const controller = new FormActionControllerElement();
	controller.engine = engine;
	controller.config = engine.defineForm({
		id: 'changes',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ id: 'changed', $type: 'change' }],
	});
	host.append(controller);
	document.body.append(host);
	await expect.poll(() => controller.form.ready).toBe(true);

	store.setValue('note', 'first');
	await expect.poll(() => changes.at(-1)).toBe('first');
	controller.remove();
	host.append(controller);
	await expect.poll(() => controller.form.ready).toBe(true);
	store.setValue('note', 'second');
	await expect.poll(() => changes.at(-1)).toBe('second');
});

test('form_change actions run after mount when the renderer context supplies the engine', async () => {
	const changes: unknown[] = [];
	const engine = createFormEngine({
		elements: [],
		actions: [
			testAction('change', ['form_change'], async ({ formData }) => {
				changes.push(formData.note);
				return { success: true };
			}),
		],
	});
	const renderer = new FormRendererElement();
	renderer.engine = engine;
	const host = document.createElement('rui-form');
	const store = new FormStore<FieldValues>({ defaultValues: { note: '' } });
	provideTestFormStore(host, store);
	const controller = new FormActionControllerElement();
	controller.config = engine.defineForm({
		id: 'context-changes',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ id: 'changed', $type: 'change' }],
	});
	host.append(controller);
	renderer.append(host);
	document.body.append(renderer);
	await expect.poll(() => controller.form.ready).toBe(true);

	store.setValue('note', 'typed');

	await expect.poll(() => changes.at(-1)).toBe('typed');
});

test('reports outcomes of grouped submit actions to the Radiant host', async () => {
	const engine = createFormEngine({
		elements: [],
		actions: [
			testAction('submit', ['form_submit', 'form_change'], async ({ config }) =>
				config.id === 'bad'
					? { success: false, shouldContinue: false, error: 'Rejected' }
					: { success: true, data: 'saved' },
			),
		],
	});
	const host = document.createElement('rui-form');
	provideTestFormStore(host, new FormStore());
	const controller = new FormActionControllerElement();
	controller.engine = engine;
	controller.config = engine.defineForm({
		id: 'actions',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [
			[
				{ id: 'ok', $type: 'submit', endpoint: '/ok' },
				{ id: 'bad', $type: 'submit', endpoint: '/bad' },
			],
		],
	});
	const outcomes = vi.fn();
	host.addEventListener('se-action-results', outcomes);
	host.append(controller);
	document.body.append(host);
	await expect.poll(() => controller.form.ready).toBe(true);
	await controller.dispatchTrigger('form_change');
	expect(outcomes.mock.calls[0][0].detail).toMatchObject({
		trigger: 'form_change',
		results: [{ actionId: 'ok' }, { actionId: 'bad' }],
	});
	await controller.dispatchTrigger('form_submit');
	expect(outcomes.mock.calls[1][0].detail).toMatchObject({
		trigger: 'form_submit',
		results: [{ actionId: 'ok' }, { actionId: 'bad' }],
	});
	const outcome = await controller.submit();
	expect(outcome).toMatchObject({
		succeeded: false,
		results: [
			{ actionId: 'ok', success: true, data: 'saved' },
			{ actionId: 'bad', success: false, error: 'Rejected' },
		],
	});
});
