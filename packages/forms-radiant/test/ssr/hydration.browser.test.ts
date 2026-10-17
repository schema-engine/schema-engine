import { userEvent } from 'vitest/browser';
import { afterEach, expect, inject, test, vi } from 'vitest';
import { RuiFormElement } from '@ecopages/radiant-ui/form';
import { FormInstanceElement } from '@/components/form-instance.script';
import { FormActionControllerElement } from '@/components/form-action-controller';
import { FormFieldElement } from '@/elements/form-field';
import { FormRendererElement } from '@/components/internals/form-renderer.script';
import { createHydrationEngine } from './hydration-engine';

await Promise.all([
	import('@/elements/inputs/form-textarea'),
	import('@/elements/inputs/form-select'),
	import('@/elements/inputs/form-checkbox'),
	import('@/elements/inputs/form-slider'),
	import('@/elements/inputs/form-input'),
	import('@/elements/inputs/form-phone-input'),
]);

function mount({ engineAfterConnect = false } = {}) {
	const engine = createHydrationEngine();
	const renderer = new FormRendererElement();
	if (!engineAfterConnect) renderer.engine = engine;
	const root = document.createElement('div');
	root.innerHTML = atob(inject('ssrHydrationHtml'));
	renderer.append(root);
	document.body.append(renderer);
	return {
		root,
		engine,
		renderer,
		instance: root.querySelector('se-form-instance') as FormInstanceElement,
		form: root.querySelector('rui-form') as RuiFormElement,
	};
}

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

test.each(['confirm', 'choice', 'accepted', 'amount'])(
	'a cross-field rule on hydrated %s reports its message',
	async (name) => {
		const { root } = mount();
		const field = root.querySelector(`se-field[name="${name}"]`) as FormFieldElement;
		await expect.poll(() => typeof field.rules?.validate).toBe('function');
		const store = field.form.store;
		expect(store).toBeDefined();
		store?.setValue('password', 'secret');
		if (name === 'confirm') {
			await userEvent.fill(field.querySelector('textarea')!, 'different');
		} else {
			store?.setValue(name, 'different');
		}
		store?.markTouched(name);
		await store?.validateField(name);
		expect(store?.getState().errors[name]?.message).toBe('Must match password');
		root.remove();
		document.body.append(root);
		const reconnectedStore = field.form.store;
		reconnectedStore?.setValue('password', 'changed');
		reconnectedStore?.setValue(name, 'different');
		await reconnectedStore?.validateField(name);
		expect(reconnectedStore?.getState().errors[name]?.message).toBe('Must match password');
	},
);

test('a hydrated field gains its cross-field validator when the engine arrives late', async () => {
	const { root, engine, renderer } = mount({ engineAfterConnect: true });
	const field = root.querySelector('se-field[name="confirm"]') as FormFieldElement;
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	expect(field.rules?.validate).toBeUndefined();

	renderer.engine = engine;

	await expect.poll(() => typeof field.rules?.validate).toBe('function');
	const store = field.form.store!;
	store.setValue('password', 'secret');
	store.setValue('confirm', 'different');
	store.markTouched('confirm');
	await store.validateField('confirm');
	expect(store.getState().errors.confirm?.message).toBe('Must match password');
});

test('hydrated submit delivers the nested value tree', async () => {
	const { instance, form } = mount();
	const onSubmit = vi.fn();
	instance.onSubmit = onSubmit;
	await expect.poll(() => typeof form.onSubmit).toBe('function');
	for (const field of form.querySelectorAll('se-field:not([name="address.street"])')) field.remove();
	const field = form.querySelector('se-field') as FormFieldElement;
	field.form.store?.setValue('address', { street: 'old' });
	await userEvent.fill(field.querySelector('input')!, 'x');
	form.querySelector('form')!.requestSubmit();
	await expect.poll(() => onSubmit.mock.calls).toEqual([[{ address: { street: 'x' } }]]);
});

test('a form without onSubmit keeps native submission', async () => {
	const { instance, form } = mount();
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	expect(form.onSubmit).toBeUndefined();
	for (const field of form.querySelectorAll('se-field')) field.remove();
	form.action = '/native';
	const nativeSubmit = vi.spyOn(form.querySelector('form')!, 'submit').mockImplementation(() => {});
	form.querySelector('form')!.requestSubmit();
	await expect.poll(() => nativeSubmit.mock.calls.length).toBe(1);
	instance.onSubmit = vi.fn();
	await expect.poll(() => typeof form.onSubmit).toBe('function');
	instance.onSubmit = undefined;
	await expect.poll(() => form.onSubmit).toBeUndefined();
});

test.each([false, true])('native submission waits for successful actions (%s)', async (succeeded) => {
	const { engine, instance, form } = mount();
	vi.spyOn(engine, 'getAction').mockReturnValue({
		$type: 'submit',
		schema: { '~standard': { version: 1, vendor: 'test', validate: (value: unknown) => ({ value }) } },
		metadata: { name: 'Submit', defaultTriggers: ['form_submit'] },
		execute: async () => (succeeded ? { success: true } : { success: false, shouldContinue: false }),
	});
	const config = engine.defineForm({
		id: 'native-action-submit',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ id: 'save', $type: 'submit', endpoint: '/save' }],
	});
	form.action = '/native';
	const controller = new FormActionControllerElement();
	controller.engine = engine;
	controller.config = config;
	form.append(controller);
	instance.config = config;
	const complete = vi.fn();
	form.addEventListener('se-action-submit-complete', complete);
	const nativeForm = form.querySelector<HTMLFormElement>('form[data-ref="form"]')!;
	const nativeSubmit = vi.spyOn(nativeForm, 'submit').mockImplementation(() => {});
	await expect.poll(() => controller.form.ready).toBe(true);
	await expect.poll(() => typeof form.onSubmit).toBe('function');

	nativeForm.requestSubmit();
	await expect.poll(() => complete.mock.calls.length).toBe(1);

	expect(complete.mock.calls[0]?.[0].detail.succeeded).toBe(succeeded);
	expect(nativeSubmit).toHaveBeenCalledTimes(succeeded ? 1 : 0);
});

test('onChange receives a nested value tree and reconnects without duplicate watchers', async () => {
	const { instance, root } = mount();
	const onChange = vi.fn();
	instance.onChange = onChange;
	const field = root.querySelector('se-field[name="address.street"]') as FormFieldElement;
	await expect.poll(() => field.form.ready).toBe(true);
	await userEvent.fill(field.querySelector('input')!, 'changed');
	await expect.poll(() => onChange.mock.calls.at(-1)?.[0].address).toEqual({ street: 'changed' });
	onChange.mockClear();
	root.remove();
	document.body.append(root);
	await expect.poll(() => field.form.ready).toBe(true);
	onChange.mockClear();
	field.form.setValue('address.street', 'reconnected');
	await expect.poll(() => onChange.mock.calls.at(-1)?.[0].address).toEqual({ street: 'reconnected' });
	const snapshots = onChange.mock.calls.filter(([values]) => values.address?.street === 'reconnected');
	expect(snapshots).toHaveLength(1);
});

test.each([
	['contact', 'not an email', 'Enter an email'],
	['phone', '+1555', 'Enter a complete phone number'],
])('hydrated %s reports the rule its registration attaches by default', async (name, value, message) => {
	const { root } = mount();
	const field = root.querySelector(`se-field[name="${name}"]`) as FormFieldElement;
	await expect.poll(() => field.form.ready).toBe(true);
	const store = field.form.store!;
	store.setValue(name, value);
	store.markTouched(name);
	await store.validateField(name);
	expect(store.getState().errors[name]?.message).toBe(message);
});
