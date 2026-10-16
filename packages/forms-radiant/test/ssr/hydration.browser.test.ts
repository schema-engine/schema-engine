import { userEvent } from 'vitest/browser';
import { afterEach, expect, inject, test, vi } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { RuiFormElement } from '@ecopages/radiant-ui/form';
import { FormInstanceElement } from '@/components/form-instance.script';
import { FormFieldElement } from '@/elements/form-field';
import { registerFormEngine, resetRegisteredFormEnginesForTests } from '@/registries/active-engine';

await Promise.all([
	import('@/elements/inputs/form-textarea'),
	import('@/elements/inputs/form-select'),
	import('@/elements/inputs/form-checkbox'),
	import('@/elements/inputs/form-slider'),
]);

function mount() {
	registerFormEngine(createFormEngine({ elements: [] }));
	const root = document.createElement('div');
	root.innerHTML = atob(inject('ssrHydrationHtml'));
	document.body.append(root);
	return {
		root,
		instance: root.querySelector('se-form-instance') as FormInstanceElement,
		form: root.querySelector('rui-form') as RuiFormElement,
	};
}

afterEach(() => {
	document.body.replaceChildren();
	resetRegisteredFormEnginesForTests();
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
