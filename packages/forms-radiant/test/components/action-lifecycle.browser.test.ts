import { afterEach, expect, test, vi } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import type { FormEngineRuntime } from '@schema-engine/forms/engine/form-engine';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import { FormController } from '@/adapters/radiant/controller';
import { FormInstanceElement } from '@/components/form-instance.script';
import { FormRendererElement } from '@/components/internals/form-renderer.script';
import { testAction } from '../adapters/test-actions';

afterEach(() => document.body.replaceChildren());

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function mountInstance(engine: FormEngineRuntime, config: NormalizedFormConfig) {
	const host = document.createElement('rui-form');
	const instance = new FormInstanceElement();
	instance.engine = engine;
	instance.config = config;
	instance.append(host);
	return { host, instance, container: () => new FormController(host).container! };
}

const oneStep = (id: string) => ({ id, steps: [{ id: 'main', title: 'Main', elements: [] }] });

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
	const { host, instance, container } = mountInstance(engine, config);
	const outcomes = vi.fn();
	host.addEventListener('se-action-results', outcomes);
	document.body.append(instance);
	await expect.poll(() => container()).toBeTruthy();

	container().setValue('name', 'Ada');

	await expect.poll(() => outcomes.mock.calls.length).toBeGreaterThan(0);
	expect(outcomes.mock.calls[0][0].detail).toMatchObject({
		trigger: 'form_change',
		results: [{ actionId: 'ok' }, { actionId: 'bad' }],
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

test('a new config starts a fresh form: its container and its mount actions', async () => {
	const execute = vi.fn(async () => ({ success: true }));
	const engine = createFormEngine({ elements: [], actions: [testAction('mount', ['form_mount'], execute)] });
	const define = () => engine.defineForm({ ...oneStep('new-config'), actions: [{ id: 'mount', $type: 'mount' }] });
	const { instance, container } = mountInstance(engine, define());
	document.body.append(instance);
	await expect.poll(() => execute.mock.calls.length).toBe(1);
	const first = container();
	first.setValue('note', 'typed');

	instance.config = define();

	await expect.poll(() => execute.mock.calls.length).toBe(2);
	expect(container()).not.toBe(first);
	expect(container().getValue('note')).toBeUndefined();
});

test('the same config object, handed to the instance again, keeps the form', async () => {
	const execute = vi.fn(async () => ({ success: true }));
	const engine = createFormEngine({ elements: [], actions: [testAction('mount', ['form_mount'], execute)] });
	const config = engine.defineForm({ ...oneStep('same-config'), actions: [{ id: 'mount', $type: 'mount' }] });
	const { instance, container } = mountInstance(engine, config);
	document.body.append(instance);
	await expect.poll(() => execute.mock.calls.length).toBe(1);
	const first = container();

	instance.config = config;
	await nextFrame();
	await nextFrame();

	expect(execute).toHaveBeenCalledTimes(1);
	expect(container()).toBe(first);
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
	const { instance, container } = mountInstance(
		engine,
		engine.defineForm({ ...oneStep('changes'), actions: [{ id: 'changed', $type: 'change' }] }),
	);
	document.body.append(instance);
	await expect.poll(() => changes.length).toBe(1);

	container().setValue('note', 'first');
	await expect.poll(() => changes.at(-1)).toBe('first');
	instance.remove();
	document.body.append(instance);
	await nextFrame();
	expect(changes).toEqual([undefined, 'first']);
	expect(container().getValue('note')).toBe('first');
	container().setValue('note', 'second');
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
	const { instance, container } = mountInstance(
		engine,
		engine.defineForm({ ...oneStep('changes'), actions: [{ id: 'changed', $type: 'change' }] }),
	);
	instance.engine = undefined;
	renderer.append(instance);
	document.body.append(renderer);
	await expect.poll(() => changes.length).toBe(1);

	container().setValue('note', 'typed');

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

	expect(await instance.next()).toBe('moved');

	expect(execute).toHaveBeenCalledOnce();
	expect(instance.getContextValue().current).toBe('second');
});
