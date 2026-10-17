import { expect, test } from 'vitest';
import { FormStore } from '@ecopages/radiant-ui/form';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import { FormInstanceElement } from '@/components/form-instance.script';
import { provideTestFormStore } from '../adapters/test-form';
import { createRoot } from '@ecopages/jsx/client';
import { FormController } from '@/adapters/radiant/controller';
import { FormRenderer } from '@/components/internals/form-renderer';
import type { FormFieldElement } from '@/elements/form-field';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';

test('authored disabled survives live constraint sync', async () => {
	const instance = new FormInstanceElement();
	instance.config = {
		id: 'disabled-form',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'input',
						id: 'ref',
						name: 'ref',
						disabled: true,
						constraints: [{ field: 'mode', operator: 'equals', value: 'manual', action: 'enable' }],
					},
				],
			},
		],
	} satisfies NormalizedFormConfig;
	const form = document.createElement('rui-form');
	const store = new FormStore({ defaultValues: { mode: 'manual' } });
	provideTestFormStore(form, store);
	const wrapper = document.createElement('div');
	wrapper.setAttribute('data-se-constraint-field', 'ref');
	const field = document.createElement('se-field');
	field.setAttribute('name', 'ref');
	wrapper.append(field);
	form.append(wrapper);
	instance.append(form);
	document.body.append(instance);
	try {
		store.setValue('mode', 'manual');
		await expect.poll(() => (field as HTMLElement & { disabled?: boolean }).disabled).toBe(true);
	} finally {
		instance.remove();
	}
});

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

async function mountFieldSet(fieldSet: Record<string, unknown>) {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	const config = engine.validateForm({
		id: 'fieldset-form',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{ $type: 'input', id: 'mode', name: 'mode' },
					{
						$type: 'fieldSet',
						id: 'address',
						name: 'address',
						elements: [
							{ $type: 'input', id: 'street', name: 'street', disabled: true },
							{ $type: 'input', id: 'city', name: 'city' },
						],
						...fieldSet,
					},
				],
			},
		],
	});
	root.render(FormRenderer({ config, engine }));
	const form = new FormController(host.querySelector('rui-form')!);
	await expect.poll(() => form.ready).toBe(true);
	const field = (name: string) => host.querySelector<FormFieldElement>(`se-field[name="address.${name}"]`)!;
	return {
		form,
		street: field('street'),
		city: field('city'),
		wrapper: host.querySelector<HTMLElement>('[data-se-constraint-field="address"]')!,
		cleanup: () => {
			form.disconnect();
			root.unmount();
			host.remove();
		},
	};
}

test('a child keeps its own disabled state after live sync', async () => {
	const { form, street, city, wrapper, cleanup } = await mountFieldSet({
		constraints: [{ field: 'mode', operator: 'equals', value: 'hide', action: 'hide' }],
	});
	try {
		form.setValue('mode', 'hide');
		await expect.poll(() => wrapper.hidden).toBe(true);
		expect(street.disabled).toBe(true);
		expect(city.disabled).toBe(false);
	} finally {
		cleanup();
	}
});

test('a constraint disable on a fieldset reaches every child it owns', async () => {
	const { form, street, city, cleanup } = await mountFieldSet({
		constraints: [{ field: 'mode', operator: 'equals', value: 'lock', action: 'disable' }],
	});
	try {
		form.setValue('mode', 'lock');
		await expect.poll(() => city.disabled).toBe(true);
		form.setValue('mode', 'open');
		await expect.poll(() => city.disabled).toBe(false);
		expect(street.disabled).toBe(true);
	} finally {
		cleanup();
	}
});

test('a constrained child inside a constrained fieldset keeps the fieldset disable', async () => {
	const { form, city, cleanup } = await mountFieldSet({
		constraints: [{ field: 'mode', operator: 'equals', value: 'lock', action: 'disable' }],
		elements: [
			{
				$type: 'input',
				id: 'city',
				name: 'city',
				constraints: [{ field: 'mode', operator: 'equals', value: 'never', action: 'hide' }],
			},
		],
	});
	try {
		form.setValue('mode', 'lock');
		await expect.poll(() => city.disabled).toBe(true);
	} finally {
		cleanup();
	}
});

test('a fieldset require reaches its children and releases them', async () => {
	const { form, city, cleanup } = await mountFieldSet({
		constraints: [{ field: 'mode', operator: 'equals', value: 'need', action: 'require' }],
	});
	try {
		form.setValue('mode', 'need');
		await expect.poll(() => city.hasAttribute('data-se-constraint-required')).toBe(true);
		expect(city.rules?.required).toBe(true);
		form.setValue('mode', 'open');
		await expect.poll(() => city.hasAttribute('data-se-constraint-required')).toBe(false);
		expect(city.rules?.required).toBeFalsy();
	} finally {
		cleanup();
	}
});

test('a child keeps its own required marker after live sync', async () => {
	const { form, city, wrapper, cleanup } = await mountFieldSet({
		constraints: [{ field: 'mode', operator: 'equals', value: 'hide', action: 'hide' }],
		elements: [{ $type: 'input', id: 'city', name: 'city', label: 'City', rules: [{ type: 'required' }] }],
	});
	try {
		form.setValue('mode', 'hide');
		await expect.poll(() => wrapper.hidden).toBe(true);
		expect(city.querySelector('[data-se-required-marker]')?.hasAttribute('hidden')).toBe(false);
		expect(city.rules?.required).toBeTruthy();
	} finally {
		cleanup();
	}
});

test('a row field of an authored disabled array stays disabled after live sync, as it renders', async () => {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	const config = engine.validateForm({
		id: 'disabled-array',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'arrayElements',
						id: 'contacts',
						name: 'contacts',
						disabled: true,
						elements: [
							{
								$type: 'input',
								id: 'email',
								name: 'email',
								constraints: [{ field: 'phone', operator: 'equals', value: 'hide', action: 'hide' }],
							},
							{ $type: 'input', id: 'phone', name: 'phone' },
						],
					},
				],
			},
		],
	});
	root.render(FormRenderer({ config, engine, defaultValues: { contacts: [{ email: '', phone: '' }] } }));
	const form = new FormController(host.querySelector('rui-form')!);
	try {
		await expect.poll(() => form.ready).toBe(true);
		const email = () => host.querySelector<FormFieldElement>('se-field[name="contacts.0.email"]');
		await expect.poll(() => email()).not.toBeNull();

		form.setValue('contacts.0.phone', 'hide');

		await expect.poll(() => email()!.closest<HTMLElement>('[data-se-constraint-field]')!.hidden).toBe(true);
		expect(email()!.disabled).toBe(true);
	} finally {
		form.disconnect();
		root.unmount();
		host.remove();
	}
});
