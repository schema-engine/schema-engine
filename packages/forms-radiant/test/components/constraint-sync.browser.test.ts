import { expect, test } from 'vitest';
import { FormStore, type FieldValues } from '@ecopages/radiant-ui/form';
import { normalizedTestConfig } from '../adapters/test-config';
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
	instance.config = normalizedTestConfig({
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
	});
	const form = document.createElement('rui-form');
	const store = new FormStore<FieldValues>({ defaultValues: { mode: 'manual' } });
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

const wrapperSources = ['Array', 'Box', 'City'] as const;

async function mountNestedWrappers() {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	const trigger = (source: string, kind: 'lock' | 'need') => ({
		field: `ctl.${kind}${source}`,
		operator: 'equals',
		value: 'x',
		action: kind === 'lock' ? 'disable' : 'require',
	});
	const constraintsFor = (source: string) => [trigger(source, 'lock'), trigger(source, 'need')];
	const config = engine.validateForm({
		id: 'nested-wrappers',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'fieldSet',
						id: 'ctl',
						name: 'ctl',
						elements: wrapperSources.flatMap((source) => [
							{ $type: 'input', id: `lock${source}`, name: `lock${source}` },
							{ $type: 'input', id: `need${source}`, name: `need${source}` },
						]),
					},
					{
						$type: 'arrayElements',
						id: 'rows',
						name: 'rows',
						constraints: constraintsFor('Array'),
						elements: [
							{ $type: 'input', id: 'label', name: 'label' },
							{
								$type: 'fieldSet',
								id: 'box',
								name: 'box',
								constraints: constraintsFor('Box'),
								elements: [
									{
										$type: 'input',
										id: 'city',
										name: 'city',
										label: 'City',
										constraints: constraintsFor('City'),
									},
								],
							},
						],
					},
				],
			},
		],
	});
	root.render(FormRenderer({ config, engine, defaultValues: { rows: [{ label: '', box: { city: '' } }] } }));
	const form = new FormController(host.querySelector('rui-form')!);
	await expect.poll(() => form.ready).toBe(true);
	const city = () => host.querySelector<FormFieldElement>('se-field[name="rows.0.box.city"]');
	await expect.poll(() => city()).not.toBeNull();
	return {
		form,
		city: city()!,
		cleanup: () => {
			form.disconnect();
			root.unmount();
			host.remove();
		},
	};
}

test.each(wrapperSources)('a field takes the disable of the %s wrapper around it and releases it', async (source) => {
	const { form, city, cleanup } = await mountNestedWrappers();
	try {
		expect(city.disabled).toBe(false);
		form.setValue(`ctl.lock${source}`, 'x');
		await expect.poll(() => city.disabled).toBe(true);
		form.setValue(`ctl.lock${source}`, '');
		await expect.poll(() => city.disabled).toBe(false);
	} finally {
		cleanup();
	}
});

test.each(wrapperSources)('a field takes the require of the %s wrapper around it and releases it', async (source) => {
	const { form, city, cleanup } = await mountNestedWrappers();
	try {
		const marker = () => city.querySelector('[data-se-required-marker]')!.hasAttribute('hidden');
		expect(marker()).toBe(true);
		form.setValue(`ctl.need${source}`, 'x');
		await expect.poll(() => city.rules?.required).toBe(true);
		expect(marker()).toBe(false);
		form.setValue(`ctl.need${source}`, '');
		await expect.poll(() => city.rules?.required).toBeFalsy();
		expect(marker()).toBe(true);
	} finally {
		cleanup();
	}
});

test('a field keeps the union of its wrappers while one of them releases', async () => {
	const { form, city, cleanup } = await mountNestedWrappers();
	try {
		for (const source of wrapperSources) {
			form.setValue(`ctl.lock${source}`, 'x');
			form.setValue(`ctl.need${source}`, 'x');
		}
		await expect.poll(() => city.disabled && city.rules?.required === true).toBe(true);

		form.setValue('ctl.lockArray', '');
		form.setValue('ctl.needArray', '');
		form.setValue('ctl.lockBox', '');
		form.setValue('ctl.needBox', '');
		await expect.poll(() => form.getValue('ctl.lockBox')).toBe('');
		expect(city.disabled).toBe(true);
		expect(city.rules?.required).toBe(true);

		form.setValue('ctl.lockCity', '');
		form.setValue('ctl.needCity', '');
		await expect.poll(() => city.disabled).toBe(false);
		expect(city.rules?.required).toBeFalsy();
	} finally {
		cleanup();
	}
});

async function mountRequireOnDependent() {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	const config = engine.validateForm({
		id: 'require-revalidation',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{ $type: 'input', id: 'mode', name: 'mode' },
					{
						$type: 'input',
						id: 'code',
						name: 'code',
						constraints: [{ field: 'mode', operator: 'equals', value: 'need', action: 'require' }],
					},
				],
			},
		],
	});
	root.render(FormRenderer({ config, engine }));
	const form = new FormController(host.querySelector('rui-form')!);
	await expect.poll(() => form.ready).toBe(true);
	const code = host.querySelector<FormFieldElement>('se-field[name="code"]')!;
	return {
		form,
		code,
		host,
		cleanup: () => {
			form.disconnect();
			root.unmount();
			host.remove();
		},
	};
}

test('a constraint that turns require on shows no error on a field nobody has reached', async () => {
	const { form, code, cleanup } = await mountRequireOnDependent();
	try {
		form.setValue('mode', 'need');
		await expect.poll(() => code.rules?.required).toBe(true);
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(form.store!.getFieldError('code')).toBeUndefined();
	} finally {
		cleanup();
	}
});

test('a constraint that turns require on validates a field the user already touched', async () => {
	const { form, code, cleanup } = await mountRequireOnDependent();
	try {
		await form.store!.handleFieldBlur('code');
		form.setValue('mode', 'need');
		await expect.poll(() => code.rules?.required).toBe(true);
		await expect.poll(() => form.store!.getFieldError('code')).toBeTruthy();
	} finally {
		cleanup();
	}
});

test('a constraint that turns require on validates any field once the form was submitted', async () => {
	const { form, code, host, cleanup } = await mountRequireOnDependent();
	try {
		host.querySelector('form')!.requestSubmit();
		await expect.poll(() => form.store!.getState().isSubmitted).toBe(true);
		form.setValue('mode', 'need');
		await expect.poll(() => code.rules?.required).toBe(true);
		await expect.poll(() => form.store!.getFieldError('code')).toBeTruthy();
	} finally {
		cleanup();
	}
});
