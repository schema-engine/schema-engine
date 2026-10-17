import { ContextProvider, ContextSubscriptionRequestEvent } from '@ecopages/radiant/context';
import { FormStore, formContext, type FormContextValue } from '@ecopages/radiant-ui/form';
import { gtmPlugin } from '@schema-engine/forms';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { formInstanceContext } from '@/contexts/form-instance-context';
import { FormRendererElement } from '@/components/internals/form-renderer.script';
import { FormInstanceElement } from '@/components/form-instance.script';
import { FormActionControllerElement } from '@/components/form-action-controller';
import { SeFormArray } from '@/elements/inputs/form-array-elements';
import { InputElementRegistration } from '@/elements/inputs/form-input.registration';
import { ArrayElementRegistration } from '@/elements/inputs/form-array-elements.registration';
import { afterEach, describe, expect, test, vi } from 'vitest';

const noopUnregister = () => {};

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

function provideFormContext(host: HTMLElement, store?: FormStore, ready = false) {
	return new ContextProvider<typeof formContext>(host, {
		context: formContext,
		initialValue: {
			ready,
			store,
			revision: 0,
			fields: {},
			errors: {},
			actions: {
				register: () => noopUnregister,
				updateFieldOptions: () => {},
				handleFieldChange: () => {},
				handleFieldBlur: () => {},
				subscribePresentation: () => noopUnregister,
			},
		} satisfies FormContextValue,
	});
}

describe('Radiant form engine resolution', () => {
	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	test('a form instance under the renderer resolves its engine when two engines exist', async () => {
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
		expect(warn).not.toHaveBeenCalled();
		observed.disconnect();
	});

	test('a form instance without a renderer does not resolve the only created engine', async () => {
		const engine = createRadiantFormEngine();
		const instance = document.createElement('se-form-instance') as FormInstanceElement;
		instance.config = twoStepForm(engine);
		document.body.append(instance);
		const observed = observeInstanceContext(instance);

		await vi.waitFor(() => {
			expect(observed.isWizard).toBe(false);
		});
		observed.disconnect();
	});

	test('a connected form instance publishes its recipe after renderer context arrives', async () => {
		const engine = createRadiantFormEngine();
		createRadiantFormEngine();
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const instance = document.createElement('se-form-instance') as FormInstanceElement;
		instance.config = twoStepForm(engine);
		renderer.append(instance);
		document.body.append(renderer);
		const observed = observeInstanceContext(instance);

		await vi.waitFor(() => {
			expect(observed.isWizard).toBe(false);
		});
		renderer.engine = engine;
		await vi.waitFor(() => {
			expect(observed.isWizard).toBe(true);
		});
		observed.disconnect();
	});

	test('an action controller dispatches its form-mount action after renderer context arrives', async () => {
		const onPush = vi.fn();
		const engine = createRadiantFormEngine({ actions: [gtmPlugin({ tracker: { push: vi.fn() }, onPush })] });
		createRadiantFormEngine();
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const form = document.createElement('rui-form');
		const controller = document.createElement('se-form-action-controller') as FormActionControllerElement;
		controller.config = engine.defineForm({
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
		provideFormContext(form, new FormStore(), true);
		form.append(controller);
		renderer.append(form);
		document.body.append(renderer);

		renderer.engine = engine;
		await vi.waitFor(() => {
			expect(onPush).toHaveBeenCalledWith('renderer-engine-arrived', expect.any(Object), expect.any(Object));
		});
	});

	test('a form array renders its fields after renderer context arrives', async () => {
		const engine = createRadiantFormEngine({ elements: [InputElementRegistration, ArrayElementRegistration] });
		createRadiantFormEngine();
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const form = document.createElement('rui-form');
		const array = document.createElement('se-form-array') as SeFormArray;
		array.config = engine.validateElement({
			$type: 'arrayElements',
			name: 'contacts',
			elements: [{ $type: 'input', name: 'email', label: 'Email' }],
		});
		const formProvider = provideFormContext(form);
		form.append(array);
		renderer.append(form);
		document.body.append(renderer);
		await vi.waitFor(() => {
			expect(array.querySelector('.se-form-array__empty')).not.toBeNull();
		});
		formProvider.setContext({
			store: new FormStore({ defaultValues: { contacts: [{ email: 'person@example.test' }] } }),
		});
		expect(array.querySelector('input')).toBeNull();

		renderer.engine = engine;
		await vi.waitFor(() => {
			expect(array.querySelector('input')).not.toBeNull();
		});
	});

	test('a form array with seeded rows waits for renderer context before rendering fields', async () => {
		const engine = createRadiantFormEngine({ elements: [InputElementRegistration, ArrayElementRegistration] });
		createRadiantFormEngine();
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const form = document.createElement('rui-form');
		const array = document.createElement('se-form-array') as SeFormArray;
		array.config = engine.validateElement({
			$type: 'arrayElements',
			name: 'contacts',
			elements: [{ $type: 'input', name: 'email', label: 'Email' }],
		});
		provideFormContext(
			form,
			new FormStore({ defaultValues: { contacts: [{ email: 'person@example.test' }] } }),
			true,
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
