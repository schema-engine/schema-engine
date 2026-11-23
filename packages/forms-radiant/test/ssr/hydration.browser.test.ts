import { userEvent } from 'vitest/browser';
import { afterEach, beforeEach, expect, inject, test, vi } from 'vitest';
import { RuiFormElement } from '@ecopages/radiant-ui/form';
import { FormInstanceElement } from '@/components/form-instance.script';
import { FormFieldElement } from '@/elements/form-field';
import { FormRendererElement } from '@/components/internals/form-renderer.script';
import { createHydrationEngine } from './hydration-engine';
import { testAction } from '../adapters/test-actions';

import { formOf } from '../components/mount-field';

await Promise.all([
	import('@/elements/inputs/form-textarea'),
	import('@/elements/inputs/form-select'),
	import('@/elements/inputs/form-checkbox'),
	import('@/elements/inputs/form-slider'),
	import('@/elements/inputs/form-input'),
	import('@/elements/inputs/form-phone-input'),
]);

function mount({ bindBeforeUpgrade = false } = {}) {
	const engine = createHydrationEngine();
	const owner = bindBeforeUpgrade ? document.implementation.createHTMLDocument() : document;
	const renderer = owner.createElement('se-form-renderer') as FormRendererElement;
	renderer.engine = engine;
	const root = owner.createElement('div');
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

const warn = vi.spyOn(console, 'warn');

beforeEach(() => {
	warn.mockClear();
});

afterEach(() => {
	const engineWarnings = warn.mock.calls.filter((call) =>
		String(call.at(-1)).includes('Could not resolve FormEngine'),
	);
	document.body.replaceChildren();
	vi.restoreAllMocks();
	expect(engineWarnings).toEqual([]);
});

test.each(['confirm', 'choice', 'accepted', 'amount'])(
	'a cross-field rule on hydrated %s reports its message',
	async (name) => {
		const { root } = mount();
		const field = root.querySelector(`se-field[name="${name}"]`) as FormFieldElement;
		await expect.poll(() => typeof field.rules?.validate).toBe('function');
		const store = formOf(field).store;
		expect(store).toBeDefined();
		const mismatch = name === 'amount' ? 7 : 'different';
		store?.setValue('password', 'secret');
		if (name === 'confirm') {
			await userEvent.fill(field.querySelector('textarea')!, 'different');
		} else {
			store?.setValue(name, mismatch);
		}
		store?.markTouched(name);
		await store?.validateField(name);
		expect(store?.getState().errors[name]?.message).toBe('Must match password');
		root.remove();
		document.body.append(root);
		const reconnectedStore = formOf(field).store;
		reconnectedStore?.setValue('password', 'changed');
		reconnectedStore?.setValue(name, mismatch);
		await reconnectedStore?.validateField(name);
		expect(reconnectedStore?.getState().errors[name]?.message).toBe('Must match password');
	},
);

test('a hydrated field has its cross-field validator from first connect when the engine is bound before upgrade', async () => {
	const { root } = mount({ bindBeforeUpgrade: true });
	const field = root.querySelector('se-field[name="confirm"]') as FormFieldElement;

	await expect.poll(() => typeof field.rules?.validate).toBe('function');
	const store = formOf(field).store!;
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
	formOf(field).store?.setValue('address', { street: 'old' });
	await userEvent.fill(field.querySelector('input')!, 'x');
	form.querySelector('form')!.requestSubmit();
	await expect.poll(() => onSubmit.mock.calls).toEqual([[{ address: { street: 'x' } }]]);
});

test('a form without onSubmit keeps native submission until a callback is set', async () => {
	const { instance, form } = mount();
	await expect.poll(() => typeof form.onSubmit).toBe('function');
	for (const field of form.querySelectorAll('se-field')) field.remove();
	form.action = '/native';
	const nativeSubmit = vi.spyOn(form.querySelector('form')!, 'submit').mockImplementation(() => {});
	form.querySelector('form')!.requestSubmit();
	await expect.poll(() => nativeSubmit.mock.calls.length).toBe(1);
	const onSubmit = vi.fn();
	instance.onSubmit = onSubmit;
	form.querySelector('form')!.requestSubmit();
	await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
	expect(nativeSubmit).toHaveBeenCalledTimes(1);
});

test.each([false, true])('native submission waits for successful actions (%s)', async (succeeded) => {
	const { engine, instance, form } = mount();
	const execute = vi.fn(async () => (succeeded ? { success: true } : { success: false, shouldContinue: false }));
	vi.spyOn(engine, 'getAction').mockReturnValue(testAction('submit', ['form_mount', 'form_submit'], execute));
	form.action = '/native';
	const nativeForm = form.querySelector<HTMLFormElement>('form[data-ref="form"]')!;
	const nativeSubmit = vi.spyOn(nativeForm, 'submit').mockImplementation(() => {});
	const complete = vi.fn();
	form.addEventListener('se-action-submit-complete', complete);
	instance.config = engine.defineForm({
		id: 'native-action-submit',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ id: 'save', $type: 'submit', endpoint: '/save' }],
	});
	await expect.poll(() => execute.mock.calls.length).toBe(1);

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
	await expect.poll(() => formOf(field).ready).toBe(true);
	await userEvent.fill(field.querySelector('input')!, 'changed');
	await expect.poll(() => onChange.mock.calls.at(-1)?.[0].address).toEqual({ street: 'changed' });
	onChange.mockClear();
	root.remove();
	document.body.append(root);
	await expect.poll(() => formOf(field).ready).toBe(true);
	onChange.mockClear();
	formOf(field).setValue('address.street', 'reconnected');
	await expect.poll(() => onChange.mock.calls.at(-1)?.[0].address).toEqual({ street: 'reconnected' });
	const snapshots = onChange.mock.calls.filter(([values]) => values.address?.street === 'reconnected');
	expect(snapshots).toHaveLength(1);
});

test.each([
	['contact', 'not an email', 'email'],
	['phone', '+1555', 'phone'],
])('hydrated %s reports the rule its registration attaches by default', async (name, value, message) => {
	const { root } = mount();
	const field = root.querySelector(`se-field[name="${name}"]`) as FormFieldElement;
	await expect.poll(() => formOf(field).ready).toBe(true);
	const store = formOf(field).store!;
	store.setValue(name, value);
	store.markTouched(name);
	await store.validateField(name);
	expect(store.getState().errors[name]?.message).toBe(message);
});

test('a hydrated constraint host keeps its server node and follows the form values', async () => {
	const { root } = mount();
	const wrapper = root.querySelector<HTMLElement>('se-constraint[data-se-constraint-field="vat"]')!;
	const field = wrapper.querySelector('se-field[name="vat"]') as FormFieldElement;
	expect(wrapper.hidden).toBe(true);
	await expect.poll(() => formOf(field).ready).toBe(true);
	expect(wrapper.hidden).toBe(true);
	expect(root.querySelector('se-constraint[data-se-constraint-field="vat"]')).toBe(wrapper);

	formOf(field).setValue('contact', 'show');
	await expect.poll(() => wrapper.hidden).toBe(false);
	formOf(field).setValue('contact', 'other');
	await expect.poll(() => wrapper.hidden).toBe(true);
});
