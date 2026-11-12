import { ContextSubscriptionRequestEvent } from '@ecopages/radiant/context';
import { FormStore, type FieldValues } from '@ecopages/radiant-ui/form';
import { provideTestFormStore } from '../adapters/test-form';
import { gtmPlugin } from '@schema-engine/forms';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { formInstanceContext } from '@/contexts/form-instance-context';
import { FormRendererElement } from '@/components/internals/form-renderer.script';
import { FormInstanceElement } from '@/components/form-instance.script';
import { SeFormArray } from '@/elements/inputs/form-array-elements';
import { InputElementRegistration } from '@/elements/inputs/form-input.registration';
import { ArrayElementRegistration } from '@/elements/inputs/form-array-elements.registration';
import type { ArrayElementsProps } from '@/elements/inputs/form-array-elements.types';
import { afterEach, describe, expect, test, vi } from 'vitest';

function twoStepForm(engine: ReturnType<typeof createRadiantFormEngine>) {
	return engine.defineForm({
		id: 'engine-context-wizard',
		steps: [
			{ id: 'first', title: 'First', elements: [] },
			{ id: 'second', title: 'Second', elements: [] },
		],
	});
}

function observeInstanceContext(host: FormInstanceElement) {
	let isWizard: boolean | undefined;
	let unsubscribe: (() => void) | undefined;
	const consumer = document.createElement('span');
	host.append(consumer);
	consumer.dispatchEvent(
		new ContextSubscriptionRequestEvent(
			formInstanceContext,
			(context) => {
				isWizard = context.isWizard;
			},
			undefined,
			true,
			(cleanup) => {
				unsubscribe = cleanup;
			},
		),
	);
	return {
		get isWizard() {
			return isWizard;
		},
		disconnect() {
			unsubscribe?.();
		},
	};
}
/**
 * The validated `contacts` array, typed as the props `se-form-array` takes.
 *
 * @remarks
 * `validateElement` returns the frozen, deeply readonly snapshot, while
 * registration render props are typed mutable. The renderer hands render
 * functions that same snapshot, so the conversion matches runtime.
 */
function contactsArray(engine: ReturnType<typeof createArrayEngine>): ArrayElementsProps {
	const config = engine.validateElement({
		$type: 'arrayElements',
		name: 'contacts',
		elements: [{ $type: 'input', name: 'email', label: 'Email' }],
	});
	return config as unknown as ArrayElementsProps;
}

function createArrayEngine() {
	return createRadiantFormEngine({ elements: [InputElementRegistration, ArrayElementRegistration] });
}

describe('Radiant form engine resolution', () => {
	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	test('a form instance under the renderer resolves the renderer engine when two engines exist', async () => {
		const engineA = createRadiantFormEngine();
		createRadiantFormEngine();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		renderer.engine = engineA;
		const instance = document.createElement('se-form-instance') as FormInstanceElement;
		instance.config = twoStepForm(engineA);
		renderer.append(instance);
		document.body.append(renderer);
		const observed = observeInstanceContext(instance);

		await vi.waitFor(() => {
			expect(observed.isWizard).toBe(true);
		});
		expect(instance.engine).toBe(engineA);
		expect(warn).not.toHaveBeenCalled();
		observed.disconnect();
	});

	test('a form instance republishes isWizard when its engine is assigned after connect', async () => {
		const engine = createRadiantFormEngine();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const instance = document.createElement('se-form-instance') as FormInstanceElement;
		instance.config = twoStepForm(engine);
		document.body.append(instance);
		const observed = observeInstanceContext(instance);
		await vi.waitFor(() => expect(observed.isWizard).toBe(false));

		instance.engine = engine;

		await vi.waitFor(() => expect(observed.isWizard).toBe(true));
		observed.disconnect();
	});

	test('replacing the engine of a connected renderer warns once and leaves resolved hosts on their engine', async () => {
		const engineA = createRadiantFormEngine();
		const engineB = createRadiantFormEngine();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const instance = document.createElement('se-form-instance') as FormInstanceElement;
		instance.config = twoStepForm(engineA);
		renderer.engine = engineA;
		renderer.append(instance);
		document.body.append(renderer);
		await vi.waitFor(() => expect(instance.engine).toBe(engineA));

		const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		renderer.engine = engineB;
		await nextFrame();
		renderer.engine = engineA;
		await nextFrame();

		expect(instance.engine).toBe(engineA);
		const reports = warn.mock.calls.filter((call) => String(call.at(-1)).includes('engine changed after'));
		expect(reports).toHaveLength(1);
	});

	test('a form instance with no engine in its tree reports it and does not pick the only created engine', async () => {
		const engine = createRadiantFormEngine();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const instance = document.createElement('se-form-instance') as FormInstanceElement;
		instance.config = twoStepForm(engine);
		document.body.append(instance);
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		const observed = observeInstanceContext(instance);

		expect(instance.engine).toBeUndefined();
		expect(observed.isWizard).toBe(false);
		expect(warn).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining('[schema-engine/forms-radiant]'),
			expect.any(String),
			expect.stringContaining('Could not resolve FormEngine for <se-form-instance>'),
		);
		observed.disconnect();
	});

	test('a form instance under a renderer that was never given an engine reports one configuration error', async () => {
		const engine = createRadiantFormEngine();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const instance = document.createElement('se-form-instance') as FormInstanceElement;
		instance.config = twoStepForm(engine);
		renderer.append(instance);
		document.body.append(renderer);
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

		expect(instance.engine).toBeUndefined();
		const reports = warn.mock.calls.filter((call) =>
			String(call.at(-1)).includes('Could not resolve FormEngine for <se-form-instance>'),
		);
		expect(reports).toHaveLength(1);
	});

	test('a form instance dispatches its form-mount action with the engine its renderer was bound to', async () => {
		const onPush = vi.fn();
		const engine = createRadiantFormEngine({ actions: [gtmPlugin({ tracker: { push: vi.fn() }, onPush })] });
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const instance = document.createElement('se-form-instance') as FormInstanceElement;
		instance.config = engine.defineForm({
			id: 'engine-context-actions',
			steps: [{ id: 'main', title: 'Main', elements: [] }],
			actions: [
				{
					$type: 'gtm_event',
					id: 'mount',
					eventName: 'renderer-engine-arrived',
					triggers: ['form_mount'],
				},
			],
		});
		instance.append(document.createElement('rui-form'));
		renderer.engine = engine;
		renderer.append(instance);
		document.body.append(renderer);

		await vi.waitFor(() => {
			expect(onPush).toHaveBeenCalledWith('renderer-engine-arrived', expect.any(Object), expect.any(Object));
		});
	});

	test('a form array renders its fields after renderer context arrives', async () => {
		const engine = createArrayEngine();
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const form = document.createElement('rui-form');
		const array = document.createElement('se-form-array') as SeFormArray;
		array.config = contactsArray(engine);
		const formProvider = provideTestFormStore(form, undefined, false);
		form.append(array);
		renderer.append(form);
		document.body.append(renderer);
		await vi.waitFor(() => {
			expect(array.querySelector('.se-form-array__empty')).not.toBeNull();
		});
		formProvider.setContext({
			store: new FormStore<FieldValues>({ defaultValues: { contacts: [{ email: 'person@example.test' }] } }),
		});
		expect(array.querySelector('input')).toBeNull();

		renderer.engine = engine;
		await vi.waitFor(() => {
			expect(array.querySelector('input')).not.toBeNull();
		});
	});

	test('a form array with seeded rows waits for renderer context before rendering fields', async () => {
		const engine = createArrayEngine();
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const form = document.createElement('rui-form');
		const array = document.createElement('se-form-array') as SeFormArray;
		array.config = contactsArray(engine);
		provideTestFormStore(
			form,
			new FormStore<FieldValues>({ defaultValues: { contacts: [{ email: 'person@example.test' }] } }),
		);
		form.append(array);
		renderer.append(form);
		document.body.append(renderer);

		await vi.waitFor(() => {
			expect(array.form.ready).toBe(true);
		});
		expect(array.querySelector('input')).toBeNull();

		renderer.engine = engine;
		await vi.waitFor(() => {
			expect(array.querySelector('input')).not.toBeNull();
		});
	});
});
