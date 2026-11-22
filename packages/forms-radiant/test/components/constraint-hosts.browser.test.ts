import { expect, test } from 'vitest';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import * as z from 'zod/mini';
import { defineInput } from '@schema-engine/forms';
import type { ConstraintLogic } from '@schema-engine/forms/schemas';
import type { ConstraintElement } from '@/components/internals/constraint-element';
import { createRoot } from '@ecopages/jsx/client';
import { FormController } from '@/adapters/radiant/controller';
import { containerOf } from './mount-field';
import { FormRenderer } from '@/components/internals/form-renderer';
import type { FormFieldElement } from '@/elements/form-field';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

test('authored disabled survives live constraints', async () => {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	const config = engine.validateForm({
		id: 'disabled-form',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{ $type: 'input', id: 'mode', name: 'mode' },
					{
						$type: 'input',
						id: 'ref',
						name: 'ref',
						disabled: true,
						constraints: [
							{ field: 'mode', operator: 'equals', value: 'manual', action: 'enable' },
							{ field: 'mode', operator: 'equals', value: 'manual', action: 'hide' },
						],
					},
				],
			},
		],
	});
	root.render(FormRenderer({ config, engine }));
	const form = new FormController(host.querySelector('rui-form')!);
	try {
		await expect.poll(() => form.container).toBeTruthy();
		const field = host.querySelector<FormFieldElement>('se-field[name="ref"]')!;
		containerOf(form.host).setValue('mode', 'manual');
		await expect.poll(() => host.querySelector('se-constraint')?.hasAttribute('hidden')).toBe(true);
		expect(field.disabled).toBe(true);
	} finally {
		root.unmount();
		host.remove();
	}
});

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
	await expect.poll(() => form.container).toBeTruthy();
	const field = (name: string) => host.querySelector<FormFieldElement>(`se-field[name="address.${name}"]`)!;
	return {
		form,
		street: field('street'),
		city: field('city'),
		wrapper: host.querySelector<HTMLElement>('[data-se-constraint-field="address"]')!,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

test('a child keeps its own disabled state after live constraints', async () => {
	const { form, street, city, wrapper, cleanup } = await mountFieldSet({
		constraints: [{ field: 'mode', operator: 'equals', value: 'hide', action: 'hide' }],
	});
	try {
		containerOf(form.host).setValue('mode', 'hide');
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
		containerOf(form.host).setValue('mode', 'lock');
		await expect.poll(() => city.disabled).toBe(true);
		containerOf(form.host).setValue('mode', 'open');
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
		containerOf(form.host).setValue('mode', 'lock');
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
		containerOf(form.host).setValue('mode', 'need');
		await expect.poll(() => city.required).toBe(true);
		containerOf(form.host).setValue('mode', 'open');
		await expect.poll(() => city.required).toBeFalsy();
	} finally {
		cleanup();
	}
});

test('a child keeps its own required marker after live constraints', async () => {
	const { form, city, wrapper, cleanup } = await mountFieldSet({
		constraints: [{ field: 'mode', operator: 'equals', value: 'hide', action: 'hide' }],
		elements: [{ $type: 'input', id: 'city', name: 'city', label: 'City', rules: [{ type: 'required' }] }],
	});
	try {
		containerOf(form.host).setValue('mode', 'hide');
		await expect.poll(() => wrapper.hidden).toBe(true);
		expect(city.querySelector('[data-se-required-marker]')?.hasAttribute('hidden')).toBe(false);
		expect(city.required).toBeTruthy();
	} finally {
		cleanup();
	}
});

test('a row field of an authored disabled array stays disabled after live constraints, as it renders', async () => {
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
		await expect.poll(() => form.container).toBeTruthy();
		const email = () => host.querySelector<FormFieldElement>('se-field[name="contacts.0.email"]');
		await expect.poll(() => email()).not.toBeNull();

		containerOf(form.host).setValue('contacts.0.phone', 'hide');

		await expect.poll(() => email()!.closest<HTMLElement>('[data-se-constraint-field]')!.hidden).toBe(true);
		expect(email()!.disabled).toBe(true);
	} finally {
		root.unmount();
		host.remove();
	}
});

const wrapperSources = ['Array', 'Box', 'City'] as const;

const trigger = (source: string, kind: 'lock' | 'need') => ({
	field: `ctl.${kind}${source}`,
	operator: 'equals',
	value: 'x',
	action: kind === 'lock' ? 'disable' : 'require',
});

const constraintsFor = (source: string) => [trigger(source, 'lock'), trigger(source, 'need')];

async function mountNestedWrappers() {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
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
	await expect.poll(() => form.container).toBeTruthy();
	const city = () => host.querySelector<FormFieldElement>('se-field[name="rows.0.box.city"]');
	await expect.poll(() => city()).not.toBeNull();
	return {
		form,
		city: city()!,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

test.each(wrapperSources)('a field takes the disable of the %s wrapper around it and releases it', async (source) => {
	const { form, city, cleanup } = await mountNestedWrappers();
	try {
		expect(city.disabled).toBe(false);
		containerOf(form.host).setValue(`ctl.lock${source}`, 'x');
		await expect.poll(() => city.disabled).toBe(true);
		containerOf(form.host).setValue(`ctl.lock${source}`, '');
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
		containerOf(form.host).setValue(`ctl.need${source}`, 'x');
		await expect.poll(() => city.required).toBe(true);
		expect(marker()).toBe(false);
		containerOf(form.host).setValue(`ctl.need${source}`, '');
		await expect.poll(() => city.required).toBeFalsy();
		expect(marker()).toBe(true);
	} finally {
		cleanup();
	}
});

test('a field keeps the union of its wrappers while one of them releases', async () => {
	const { form, city, cleanup } = await mountNestedWrappers();
	try {
		for (const source of wrapperSources) {
			containerOf(form.host).setValue(`ctl.lock${source}`, 'x');
			containerOf(form.host).setValue(`ctl.need${source}`, 'x');
		}
		await expect.poll(() => city.disabled && city.required === true).toBe(true);

		containerOf(form.host).setValue('ctl.lockArray', '');
		containerOf(form.host).setValue('ctl.needArray', '');
		containerOf(form.host).setValue('ctl.lockBox', '');
		containerOf(form.host).setValue('ctl.needBox', '');
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(city.disabled).toBe(true);
		expect(city.required).toBe(true);

		containerOf(form.host).setValue('ctl.lockCity', '');
		containerOf(form.host).setValue('ctl.needCity', '');
		await expect.poll(() => city.disabled).toBe(false);
		expect(city.required).toBeFalsy();
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
	await expect.poll(() => form.container).toBeTruthy();
	const code = host.querySelector<FormFieldElement>('se-field[name="code"]')!;
	return {
		form,
		code,
		host,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

test('a constraint that turns require on shows no error on a field nobody has reached', async () => {
	const { form, code, cleanup } = await mountRequireOnDependent();
	try {
		containerOf(form.host).setValue('mode', 'need');
		await expect.poll(() => code.required).toBe(true);
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(containerOf(form.host).getSnapshot().errors.code).toBeUndefined();
	} finally {
		cleanup();
	}
});

test('a constraint that turns require on validates a field the user already touched', async () => {
	const { form, code, cleanup } = await mountRequireOnDependent();
	try {
		form.container!.blur('code');
		containerOf(form.host).setValue('mode', 'need');
		await expect.poll(() => code.required).toBe(true);
		await expect.poll(() => containerOf(form.host).getSnapshot().errors.code).toBeTruthy();
	} finally {
		cleanup();
	}
});

test('turning require on and off changes only what the field announces', async () => {
	const { form, code, cleanup } = await mountRequireOnDependent();
	try {
		expect(code.required).toBe(false);
		containerOf(form.host).setValue('mode', 'need');
		await expect.poll(() => code.required).toBe(true);
		containerOf(form.host).setValue('mode', '');
		await expect.poll(() => code.required).toBeFalsy();
	} finally {
		cleanup();
	}
});

async function mountForm(elements: Record<string, unknown>[], defaultValues?: Record<string, unknown>) {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	const config = engine.validateForm({ id: 'hosts', steps: [{ id: 'main', title: 'Main', elements }] });
	root.render(FormRenderer({ config, engine, defaultValues }));
	const form = new FormController(host.querySelector('rui-form')!);
	await expect.poll(() => form.container).toBeTruthy();
	return {
		form,
		host,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

const hideWhen = (field: string, value: string) => [{ field, operator: 'equals', value, action: 'hide' }];

const rowForm = [
	{
		$type: 'arrayElements',
		id: 'rows',
		name: 'rows',
		elements: [
			{ $type: 'input', id: 'kind', name: 'kind' },
			{ $type: 'input', id: 'tag', name: 'tag', constraints: hideWhen('kind', 'hide') },
		],
	},
];

test('changing constraints or fieldPath on a connected host re-evaluates it', async () => {
	const { form, host, cleanup } = await mountForm(
		[
			{ $type: 'input', id: 'mode', name: 'mode' },
			{ $type: 'input', id: 'ref', name: 'ref', constraints: hideWhen('mode', 'hide') },
		],
		{ mode: '' },
	);
	try {
		const wrapper = host.querySelector<ConstraintElement>('se-constraint')!;
		containerOf(form.host).setValue('mode', 'hide');
		await expect.poll(() => wrapper.hidden).toBe(true);

		wrapper.constraints = hideWhen('mode', 'other') as typeof wrapper.constraints;
		await expect.poll(() => wrapper.hidden).toBe(false);

		wrapper.constraints = hideWhen('mode', 'hide') as typeof wrapper.constraints;
		await expect.poll(() => wrapper.hidden).toBe(true);
	} finally {
		cleanup();
	}
});

test('changing the fieldPath of a connected host resolves its siblings in the new row', async () => {
	const { host, cleanup } = await mountForm(rowForm, { rows: [{ kind: 'hide' }, { kind: 'show' }] });
	try {
		const wrapper = () => host.querySelector<ConstraintElement>('[data-se-constraint-field="rows.0.tag"]')!;
		const first = wrapper();
		await expect.poll(() => first.hidden).toBe(true);

		first.fieldPath = 'rows.1.tag';

		await expect.poll(() => first.hidden).toBe(false);
	} finally {
		cleanup();
	}
});

test('a require released on a touched field clears its error', async () => {
	const { form, host, cleanup } = await mountForm([
		{ $type: 'input', id: 'mode', name: 'mode' },
		{
			$type: 'input',
			id: 'code',
			name: 'code',
			constraints: [{ field: 'mode', operator: 'equals', value: 'need', action: 'require' }],
		},
	]);
	try {
		const code = host.querySelector<FormFieldElement>('se-field[name="code"]')!;
		form.container!.blur('code');
		containerOf(form.host).setValue('mode', 'need');
		await expect.poll(() => containerOf(form.host).getSnapshot().errors.code).toBeTruthy();

		containerOf(form.host).setValue('mode', '');

		await expect.poll(() => code.required).toBeFalsy();
		await expect.poll(() => containerOf(form.host).getSnapshot().errors.code).toBeUndefined();
	} finally {
		cleanup();
	}
});

test('a require released after a failed check clears its error', async () => {
	const { form, cleanup } = await mountForm([
		{ $type: 'input', id: 'mode', name: 'mode' },
		{
			$type: 'input',
			id: 'code',
			name: 'code',
			constraints: [{ field: 'mode', operator: 'equals', value: 'need', action: 'require' }],
		},
	]);
	try {
		containerOf(form.host).setValue('mode', 'need');
		expect(await containerOf(form.host).validate()).toBe(false);
		expect(containerOf(form.host).getSnapshot().errors.code).toBeTruthy();

		containerOf(form.host).setValue('mode', '');

		await expect.poll(() => containerOf(form.host).getSnapshot().errors.code).toBeUndefined();
	} finally {
		cleanup();
	}
});

test('array rows evaluate their constraints independently, including a row added later', async () => {
	const { form, host, cleanup } = await mountForm(rowForm, { rows: [{ kind: 'hide' }, { kind: 'show' }] });
	try {
		const hidden = () => [...host.querySelectorAll<HTMLElement>('se-constraint')].map((wrapper) => wrapper.hidden);
		await expect.poll(hidden).toEqual([true, false]);

		containerOf(form.host).setValue('rows.0.kind', 'show');
		await expect.poll(hidden).toEqual([false, false]);

		containerOf(form.host).setValue('rows.1.kind', 'hide');
		await expect.poll(hidden).toEqual([false, true]);

		containerOf(form.host).fieldArray('rows').append({ kind: 'hide', tag: '' });
		await expect.poll(hidden).toEqual([false, true, true]);

		containerOf(form.host).setValue('rows.2.kind', 'show');
		await expect.poll(hidden).toEqual([false, true, false]);
	} finally {
		cleanup();
	}
});

test('a server-hidden wrapper stays hidden through hydration until values say otherwise', async () => {
	const hiddenStates: boolean[] = [];
	const observer = new MutationObserver((records) => {
		for (const record of records) {
			if (record.target.nodeName === 'SE-CONSTRAINT') hiddenStates.push((record.target as HTMLElement).hidden);
		}
	});
	observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['hidden'] });
	const { form, cleanup } = await mountForm(
		[
			{ $type: 'input', id: 'mode', name: 'mode' },
			{ $type: 'input', id: 'ref', name: 'ref', constraints: hideWhen('mode', 'hide') },
		],
		{ mode: 'hide' },
	);
	try {
		const wrapper = document.querySelector<ConstraintElement>('se-constraint')!;
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(wrapper.hidden).toBe(true);
		expect(hiddenStates).not.toContain(false);

		containerOf(form.host).setValue('mode', 'show');
		await expect.poll(() => wrapper.hidden).toBe(false);
	} finally {
		observer.disconnect();
		cleanup();
	}
});

test('a server-rendered hidden wrapper keeps its snapshot while no instance publishes values', async () => {
	const host = document.createElement('div');
	host.innerHTML = `<se-constraint hidden data-se-constraint-field="ref" data-se-constraints='${JSON.stringify(hideWhen('mode', 'hide'))}'></se-constraint>`;
	document.body.append(host);
	try {
		const wrapper = host.querySelector<ConstraintElement>('se-constraint')!;
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(wrapper.hidden).toBe(true);
	} finally {
		host.remove();
	}
});

test('an unnamed constrained element in an array row resolves its siblings in that row, before and after hydration', async () => {
	const note = defineInput({
		$type: 'note',
		schema: z.looseObject({
			$type: z.literal('note'),
			id: z.string(),
			constraints: z.optional(z.custom<ConstraintLogic[]>()),
		}),
		metadata: { name: 'Note', category: 'input' },
		render: () => jsx('p', { children: 'note' }),
	});
	const noteEngine = createRadiantFormEngine({ elements: [...schemaFormRegistrations, note] });
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	const config = noteEngine.validateForm({
		id: 'unnamed',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'arrayElements',
						id: 'rows',
						name: 'rows',
						elements: [
							{ $type: 'input', id: 'kind', name: 'kind' },
							{ $type: 'note', id: 'remark', constraints: hideWhen('kind', 'hide') },
						],
					},
				],
			},
		],
	});
	root.render(
		FormRenderer({ config, engine: noteEngine, defaultValues: { rows: [{ kind: 'hide' }, { kind: 'show' }] } }),
	);
	const hidden = () => [...host.querySelectorAll<HTMLElement>('se-constraint')].map((wrapper) => wrapper.hidden);
	const form = new FormController(host.querySelector('rui-form')!);
	try {
		await expect.poll(() => hidden().length).toBe(2);
		expect(hidden()).toEqual([true, false]);
		await expect.poll(() => form.container).toBeTruthy();
		expect(hidden()).toEqual([true, false]);
		containerOf(form.host).setValue('rows.1.kind', 'hide');
		await expect.poll(hidden).toEqual([true, true]);
		containerOf(form.host).setValue('rows.0.kind', 'show');
		await expect.poll(hidden).toEqual([false, true]);
	} finally {
		root.unmount();
		host.remove();
	}
});
