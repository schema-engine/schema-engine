import { afterEach, expect, test, vi } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import type { FormEngineRuntime } from '@schema-engine/forms/engine/form-engine';
import type { FormConfigView, NormalizedFormConfig } from '@schema-engine/forms';
import { FormStore, type FieldValues } from '@ecopages/radiant-ui/form';
import { FormController } from '@/adapters/radiant/controller';
import { FormActions } from '@/adapters/radiant/form-actions';
import { FormInstanceElement } from '@/components/form-instance.script';
import { FormRendererElement } from '@/components/internals/form-renderer.script';
import { provideTestFormStore } from '../adapters/test-form';
import { testAction, type TestActionContext } from '../adapters/test-actions';

afterEach(() => document.body.replaceChildren());

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function mountActions(
	engine: FormEngineRuntime,
	config: FormConfigView,
	options: { store?: FormStore; onAction?: ConstructorParameters<typeof FormActions>[0]['onAction'] } = {},
) {
	const host = document.createElement('rui-form');
	provideTestFormStore(host, options.store ?? new FormStore());
	document.body.append(host);
	const form = new FormController(host);
	const formActions = new FormActions({
		config: () => config,
		engine,
		form,
		currentStep: () => 0,
		onAction: options.onAction,
	});
	return { host, form, formActions };
}

function mountInstance(engine: FormEngineRuntime, config: NormalizedFormConfig) {
	const host = document.createElement('rui-form');
	const instance = new FormInstanceElement();
	instance.engine = engine;
	instance.config = config;
	instance.append(host);
	return { host, instance, store: () => new FormController(host).store! };
}

const oneStep = (id: string) => ({ id, steps: [{ id: 'main', title: 'Main', elements: [] }] });

test('submission action callback receives the successful action and nested values in lifecycle order', async () => {
	const events: string[] = [];
	const execute = vi.fn(async (_context: TestActionContext) => ({ success: true }));
	const engine = createFormEngine({ elements: [], actions: [testAction('submit', ['form_submit'], execute)] });
	const onAction = vi.fn(async () => {
		events.push('callback');
	});
	const { form, formActions } = mountActions(
		engine,
		engine.defineForm({ ...oneStep('save'), actions: [{ id: 'save', $type: 'submit', endpoint: '/save' }] }),
		{
			store: new FormStore<FieldValues>({ defaultValues: { 'address.street': 'Main' } }),
			onAction,
		},
	);
	const ready = vi.spyOn(form, 'ready', 'get').mockReturnValue(false);
	await expect(formActions.submit()).resolves.toEqual({ succeeded: false, results: [] });
	expect(events).toEqual([]);
	ready.mockRestore();

	await expect(formActions.submit()).resolves.toMatchObject({ succeeded: true });

	expect(events).toEqual(['callback']);
	expect(onAction).toHaveBeenCalledTimes(1);
	expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'save' }), { address: { street: 'Main' } });
	expect(execute.mock.calls.at(-1)?.[0]).toMatchObject({
		trigger: 'form_submit',
		formData: { address: { street: 'Main' } },
	});
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
	const { formActions } = mountActions(
		engine,
		engine.defineForm({ ...oneStep('prepare'), actions: [{ id: 'prepare', $type: 'submit', endpoint: '/save' }] }),
		{
			store: new FormStore<FieldValues>({ defaultValues: { status: 'draft' } }),
		},
	);

	await formActions.submit();

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
		const onAction = vi.fn(async () => {
			throw new Error('callback failure');
		});
		const config = engine.defineForm({
			...oneStep('failure'),
			actions: [
				{ id: 'first', $type: 'submit', endpoint: '/save' },
				{ id: 'second', $type: 'submit', endpoint: '/save' },
			],
		});
		const { formActions } = mountActions(engine, config, { onAction });

		const outcome = await formActions.submit();

		expect(executed).toEqual(['first']);
		expect(onAction).toHaveBeenCalledTimes(callbackRejects ? 1 : 0);
		expect(outcome).toEqual({
			succeeded: false,
			results: [expect.objectContaining({ actionId: 'first', success: false, shouldContinue: false })],
		});
	},
);

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
	const config = engine.defineForm({
		...oneStep('grouped'),
		actions: [
			[
				{ id: 'ok', $type: 'submit', endpoint: '/ok' },
				{ id: 'bad', $type: 'submit', endpoint: '/bad' },
			],
		],
	});
	const { host, formActions } = mountActions(engine, config);
	const outcomes = vi.fn();
	host.addEventListener('se-action-results', outcomes);

	await formActions.dispatchTrigger('form_change');
	expect(outcomes.mock.calls[0][0].detail).toMatchObject({
		trigger: 'form_change',
		results: [{ actionId: 'ok' }, { actionId: 'bad' }],
	});
	await formActions.dispatchTrigger('form_submit');
	expect(outcomes.mock.calls[1][0].detail).toMatchObject({
		trigger: 'form_submit',
		results: [{ actionId: 'ok' }, { actionId: 'bad' }],
	});
	const outcome = await formActions.submit();
	expect(outcome).toMatchObject({
		succeeded: false,
		results: [
			{ actionId: 'ok', success: true, data: 'saved' },
			{ actionId: 'bad', success: false, error: 'Rejected' },
		],
	});
});

test('the instance runs mount actions again after its engine changes', async () => {
	const executeA = vi.fn(async () => ({ success: true }));
	const executeB = vi.fn(async () => ({ success: true }));
	const engineA = createFormEngine({ elements: [], actions: [testAction('mount', ['form_mount'], executeA)] });
	const engineB = createFormEngine({ elements: [], actions: [testAction('mount', ['form_mount'], executeB)] });
	const { instance } = mountInstance(
		engineA,
		engineA.defineForm({ ...oneStep('engine-a-mount'), actions: [{ id: 'mount-a', $type: 'mount' }] }),
	);
	document.body.append(instance);
	await expect.poll(() => executeA.mock.calls.length).toBe(1);

	instance.engine = engineB;
	instance.config = engineB.defineForm({
		...oneStep('engine-b-mount'),
		actions: [{ id: 'mount-b', $type: 'mount' }],
	});

	await expect.poll(() => executeB.mock.calls.length).toBe(1);
	expect(executeA).toHaveBeenCalledTimes(1);
});

test('the instance rebuilds its actions when only the engine changes', async () => {
	const executeA = vi.fn(async () => ({ success: true }));
	const executeB = vi.fn(async () => ({ success: true }));
	const engineA = createFormEngine({ elements: [], actions: [testAction('mount', ['form_mount'], executeA)] });
	const engineB = createFormEngine({ elements: [], actions: [testAction('mount', ['form_mount'], executeB)] });
	const config = engineA.defineForm({ ...oneStep('engine-only'), actions: [{ id: 'mount', $type: 'mount' }] });
	const { instance } = mountInstance(engineA, config);
	document.body.append(instance);
	await expect.poll(() => executeA.mock.calls.length).toBe(1);

	instance.engine = engineB;

	await expect.poll(() => executeB.mock.calls.length).toBe(1);
	expect(executeA).toHaveBeenCalledTimes(1);
});

test('re-rendering with an equal but new config does not fire form_mount again', async () => {
	const execute = vi.fn(async () => ({ success: true }));
	const engine = createFormEngine({ elements: [], actions: [testAction('mount', ['form_mount'], execute)] });
	const define = () => engine.defineForm({ ...oneStep('equal-config'), actions: [{ id: 'mount', $type: 'mount' }] });
	const { instance } = mountInstance(engine, define());
	document.body.append(instance);
	await expect.poll(() => execute.mock.calls.length).toBe(1);

	instance.config = define();
	await nextFrame();
	await nextFrame();

	expect(execute).toHaveBeenCalledTimes(1);
});

test('form_change actions keep running after the instance reconnects', async () => {
	const changes: unknown[] = [];
	const engine = createFormEngine({
		elements: [],
		actions: [
			testAction('change', ['form_mount', 'form_change'], async ({ formData }) => {
				changes.push(formData.note);
				return { success: true };
			}),
		],
	});
	const { instance, store: readStore } = mountInstance(
		engine,
		engine.defineForm({ ...oneStep('changes'), actions: [{ id: 'changed', $type: 'change' }] }),
	);
	document.body.append(instance);
	await expect.poll(() => changes.length).toBe(1);
	const store = readStore();

	store.setValue('note', 'first');
	await expect.poll(() => changes.at(-1)).toBe('first');
	instance.remove();
	document.body.append(instance);
	await expect.poll(() => changes.filter((note) => note === 'first').length).toBe(2);
	store.setValue('note', 'second');
	await expect.poll(() => changes.at(-1)).toBe('second');
});

test('form_change actions run after mount when the renderer context supplies the engine', async () => {
	const changes: unknown[] = [];
	const engine = createFormEngine({
		elements: [],
		actions: [
			testAction('change', ['form_mount', 'form_change'], async ({ formData }) => {
				changes.push(formData.note);
				return { success: true };
			}),
		],
	});
	const renderer = new FormRendererElement();
	renderer.engine = engine;
	const { instance, store: readStore } = mountInstance(
		engine,
		engine.defineForm({ ...oneStep('changes'), actions: [{ id: 'changed', $type: 'change' }] }),
	);
	instance.engine = undefined;
	renderer.append(instance);
	document.body.append(renderer);
	await expect.poll(() => changes.length).toBe(1);
	const store = readStore();

	store.setValue('note', 'typed');

	await expect.poll(() => changes.at(-1)).toBe('typed');
});

test('step navigation dispatches step triggers once from the instance, with no action element', async () => {
	const execute = vi.fn(async () => ({ success: true }));
	const engine = createFormEngine({ elements: [], actions: [testAction('nav', ['step_change'], execute)] });
	const { instance } = mountInstance(
		engine,
		engine.defineForm({
			id: 'step-triggers',
			steps: [
				{ id: 'first', title: 'First', elements: [] },
				{ id: 'second', title: 'Second', elements: [] },
			],
			actions: [{ id: 'on-step', $type: 'nav' }],
		}),
	);
	document.body.append(instance);
	await nextFrame();

	await instance.goToNextStep();

	expect(execute).toHaveBeenCalledOnce();
	expect(instance.currentStep).toBe(1);
});
