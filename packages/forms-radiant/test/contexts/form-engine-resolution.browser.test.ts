import { ContextSubscriptionRequestEvent } from '@ecopages/radiant/context';
import { createFormStateContainer } from '@schema-engine/forms/state-container';
import { FormController } from '@/adapters/radiant/controller';
import { provideTestContainer } from '../adapters/test-form';
import { gtmPlugin } from '@schema-engine/forms';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { formEngineContext } from '@/components/provider';
import { formInstanceContext } from '@/contexts/form-instance-context';
import { FormRendererElement } from '@/components/internals/form-renderer.script';
import { FormInstanceElement } from '@/components/form-instance.script';
import { SeFormArray } from '@/elements/inputs/form-array-elements';
import { InputElementRegistration } from '@/elements/inputs/form-input.registration';
import { ArrayElementRegistration } from '@/elements/inputs/form-array-elements.registration';
import type { ArrayElementsProps } from '@/elements/inputs/form-array-elements.types';
import { customElement } from '@ecopages/radiant';
import { afterEach, describe, expect, test, vi } from 'vitest';

function defineLateRenderer(): void {
	@customElement('se-late-renderer')
	class LateRenderer extends FormRendererElement {}
	void LateRenderer;
}

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
				isWizard = context?.isWizard;
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

	test('a form instance follows the engine its connected renderer is rebound to', async () => {
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

		renderer.engine = engineB;

		await vi.waitFor(() => expect(instance.engine).toBe(engineB));
		expect(warn).not.toHaveBeenCalled();
	});

	test('a form instance keeps an engine assigned to it over the renderer engine', async () => {
		const own = createRadiantFormEngine();
		const bound = createRadiantFormEngine();
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const instance = document.createElement('se-form-instance') as FormInstanceElement;
		instance.config = twoStepForm(own);
		instance.engine = own;
		renderer.append(instance);
		document.body.append(renderer);

		renderer.engine = bound;
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

		expect(instance.engine).toBe(own);
	});

	test('a form instance resolves an engine bound to its renderer after both connected', async () => {
		const engine = createRadiantFormEngine();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const instance = document.createElement('se-form-instance') as FormInstanceElement;
		instance.config = twoStepForm(engine);
		renderer.append(instance);
		document.body.append(renderer);
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		expect(instance.engine).toBeUndefined();

		renderer.engine = engine;

		await vi.waitFor(() => expect(instance.engine).toBe(engine));
		expect(warn).not.toHaveBeenCalled();
	});

	test('a renderer adopts an engine assigned before it upgrades and the hosts below resolve it', async () => {
		const engine = createRadiantFormEngine();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const inert = document.implementation.createHTMLDocument('');
		const renderer = inert.createElement('se-form-renderer');
		Reflect.set(renderer, 'engine', engine);
		const instance = inert.createElement('se-form-instance');
		renderer.append(instance);
		expect(renderer).not.toBeInstanceOf(FormRendererElement);

		document.body.append(document.adoptNode(renderer));

		expect(renderer).toBeInstanceOf(FormRendererElement);
		expect((renderer as FormRendererElement).engine).toBe(engine);
		await vi.waitFor(() => expect((instance as FormInstanceElement).engine).toBe(engine));
		expect(warn).not.toHaveBeenCalled();
	});

	test('a renderer without an engine resolves one that an ancestor answers for the context', async () => {
		const engine = createRadiantFormEngine();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const provider = document.createElement('div');
		provider.addEventListener('context-subscription-request', (event) => {
			if (!(event instanceof ContextSubscriptionRequestEvent) || event.context !== formEngineContext) return;
			event.stopPropagation();
			event.callback({ engine }, () => {});
		});
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const instance = document.createElement('se-form-instance') as FormInstanceElement;
		instance.config = twoStepForm(engine);
		renderer.append(instance);
		provider.append(renderer);
		document.body.append(provider);

		await vi.waitFor(() => expect(instance.engine).toBe(engine));
		expect(warn).not.toHaveBeenCalled();
	});

	test('a form instance with no engine stays quiet until the form is used, then reports once', async () => {
		const engine = createRadiantFormEngine();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const instance = document.createElement('se-form-instance') as FormInstanceElement;
		instance.config = twoStepForm(engine);
		const field = document.createElement('input');
		instance.append(field);
		renderer.append(instance);
		document.body.append(renderer);
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		expect(instance.engine).toBeUndefined();
		expect(warn).not.toHaveBeenCalled();

		field.focus();
		field.blur();
		field.focus();

		const reports = warn.mock.calls.filter((call) => String(call.at(-1)).includes('without a FormEngine'));
		expect(reports).toHaveLength(1);
	});

	test('a form instance bound before use never reports a missing engine', async () => {
		const engine = createRadiantFormEngine();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const instance = document.createElement('se-form-instance') as FormInstanceElement;
		instance.config = twoStepForm(engine);
		const field = document.createElement('input');
		instance.append(field);
		renderer.append(instance);
		document.body.append(renderer);
		renderer.engine = engine;
		await vi.waitFor(() => expect(instance.engine).toBe(engine));

		field.focus();

		expect(warn).not.toHaveBeenCalled();
	});

	test('a form instance connected before its renderer is defined still receives the engine', async () => {
		const engine = createRadiantFormEngine();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const tag = 'se-late-renderer';
		const renderer = document.createElement(tag);
		const instance = document.createElement('se-form-instance') as FormInstanceElement;
		instance.config = twoStepForm(engine);
		renderer.append(instance);
		document.body.append(renderer);
		Reflect.set(renderer, 'engine', engine);
		expect(instance.engine).toBeUndefined();

		defineLateRenderer();

		await vi.waitFor(() => expect(instance.engine).toBe(engine));
		expect(warn).not.toHaveBeenCalled();
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

	const contactsContainer = (engine: ReturnType<typeof createArrayEngine>) =>
		createFormStateContainer({
			config: { steps: [{ elements: [] }], validationMode: 'onSubmit', reValidateMode: 'onChange' },
			registry: engine.getValidationRegistry(),
			defaults: { contacts: [{ email: 'person@example.test' }] },
		});

	test('a form array renders its fields once the form container arrives', async () => {
		const engine = createArrayEngine();
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		renderer.engine = engine;
		const form = document.createElement('div');
		const array = document.createElement('se-form-array') as SeFormArray;
		array.config = contactsArray(engine);
		const formProvider = provideTestContainer(form, undefined);
		form.append(array);
		renderer.append(form);
		document.body.append(renderer);
		await vi.waitFor(() => {
			expect(array.querySelector('.se-form-array__empty')).not.toBeNull();
		});
		formProvider.setContext({ ...formProvider.getContext(), container: contactsContainer(engine) });
		await vi.waitFor(() => {
			expect(array.querySelector('input')).not.toBeNull();
		});
	});

	test('a form array renders its fields when its renderer is given the engine after connect', async () => {
		const engine = createArrayEngine();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const form = document.createElement('div');
		const array = document.createElement('se-form-array') as SeFormArray;
		array.config = contactsArray(engine);
		provideTestContainer(form, contactsContainer(engine));
		form.append(array);
		renderer.append(form);
		document.body.append(renderer);
		await vi.waitFor(() => expect(new FormController(array).container).toBeDefined());
		expect(array.querySelector('input')).toBeNull();

		renderer.engine = engine;

		await vi.waitFor(() => expect(array.querySelector('input')).not.toBeNull());
		expect(warn).not.toHaveBeenCalled();
	});

	test('a form array with seeded rows renders its fields when the renderer has its engine before connect', async () => {
		const engine = createArrayEngine();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const renderer = document.createElement('se-form-renderer') as FormRendererElement;
		const form = document.createElement('div');
		const array = document.createElement('se-form-array') as SeFormArray;
		array.config = contactsArray(engine);
		provideTestContainer(form, contactsContainer(engine));
		renderer.engine = engine;
		form.append(array);
		renderer.append(form);
		document.body.append(renderer);

		await vi.waitFor(() => expect(array.querySelector('input')).not.toBeNull());
		expect(warn).not.toHaveBeenCalled();
	});
});
