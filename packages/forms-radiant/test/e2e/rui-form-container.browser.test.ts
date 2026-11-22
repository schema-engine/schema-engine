import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { RuiFormElement } from '@ecopages/radiant-ui/form';
import '@ecopages/radiant-ui/form';
import '@ecopages/radiant-ui/field';
import { flattenStepElements } from '@schema-engine/forms/lib/field-scope';
import { createFormStateContainer, FORM_ROOT } from '@schema-engine/forms/state-container';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';

/**
 * The real `rui-form` and `rui-field` of Radiant UI over the real container of the engine, with no
 * Schema Engine element in between: what the instance relies on, tested on its own.
 */
const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

const gate = { pending: [] as Array<() => void>, hold: false };
vi.stubGlobal(
	'fetch',
	vi.fn(async () => {
		if (gate.hold) await new Promise<void>((resolve) => gate.pending.push(resolve));
		return new Response(JSON.stringify({ valid: true }));
	}),
);

const config = engine.validateForm({
	id: 'e2e',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					rules: [
						{ type: 'required', id: 'name-required' },
						{ type: 'async', url: '/check', disableCache: true },
					],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					rules: [{ type: 'minLength', value: 5, id: 'email-min' }],
				},
				{
					$type: 'arrayElements',
					id: 'contacts',
					name: 'contacts',
					elements: [
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							rules: [{ type: 'required', id: 'contact-required' }],
						},
						{ $type: 'input', id: 'role', name: 'role' },
					],
				},
			],
		},
	],
});

const defaults = () => ({
	name: '',
	email: '',
	contacts: [
		{ email: 'a@x.io', role: 'a' },
		{ email: 'b@x.io', role: 'b' },
	],
});

const cleanups: Array<() => void> = [];
afterEach(() => {
	gate.hold = false;
	for (const release of gate.pending.splice(0)) release();
	for (const cleanup of cleanups.splice(0)) cleanup();
});

const settle = async (ms = 20) => {
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
	await new Promise((resolve) => setTimeout(resolve, ms));
};

/** Presents an issue the way an application's formatter would: identity, never text the library made up. */
const format = (issue: { type?: string; source?: string; ruleId?: string }, field: { path: string }) =>
	`${field.path}|${issue.source}:${issue.type}:${issue.ruleId ?? '-'}`;

function makeField(name: string, attributes: Record<string, string> = {}) {
	const field = document.createElement('rui-field');
	field.setAttribute('name', name);
	const input = document.createElement('input');
	input.setAttribute('data-rui-control', '');
	for (const [key, value] of Object.entries(attributes)) input.setAttribute(key, value);
	const error = document.createElement('p');
	error.setAttribute('data-rui-field-error', '');
	error.hidden = true;
	field.append(input, error);
	return { field, input, error };
}

async function mount(options: { validationMode?: 'onBlur' | 'onChange' | 'onSubmit' } = {}) {
	const container = createFormStateContainer({
		elements: flattenStepElements(config.steps),
		registry: engine.getValidationRegistry(),
		defaults: defaults(),
		validationMode: options.validationMode ?? 'onBlur',
		reValidateMode: 'onChange',
	});
	const form = document.createElement('rui-form') as RuiFormElement;
	const nativeForm = document.createElement('form');
	nativeForm.setAttribute('data-ref', 'form');
	nativeForm.noValidate = true;
	const fields = {
		name: makeField('name'),
		email: makeField('email', { type: 'email', required: '' }),
		first: makeField('contacts.0.email'),
		second: makeField('contacts.1.email'),
	};
	for (const { field } of Object.values(fields)) nativeForm.append(field);
	form.append(nativeForm);
	document.body.append(form);
	cleanups.push(() => form.remove());
	await customElements.whenDefined('rui-form');
	await customElements.whenDefined('rui-field');
	const submissions: Array<{ passed: boolean; values: Readonly<Record<string, unknown>> }> = [];
	let lastSubmission: ReturnType<typeof container.beginSubmission> | undefined;
	const disconnect = form.connect(container, {
		formatError: format,
		submitHandler: async (context) => {
			const submission = container.beginSubmission();
			lastSubmission = submission;
			await container.validate(undefined, { native: context.readNativeValidity(), submission });
			submissions.push({ passed: submission.outcome === 'passed', values: submission.values });
		},
		resetHandler: () => container.reset(),
	});
	cleanups.push(disconnect);
	await settle();
	return { container, form, nativeForm, fields, submissions, submission: () => lastSubmission };
}

function type(input: HTMLInputElement, value: string): void {
	input.focus();
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
}

describe('rui-form over the engine container', () => {
	test('typing writes the nested value, and a blur with a changed value is one notification', async () => {
		const { container, fields } = await mount();
		const seen: Array<ReturnType<typeof container.getSnapshot>> = [];
		container.subscribe(() => seen.push(container.getSnapshot()));
		fields.name.input.focus();
		fields.name.input.value = 'Ada';
		fields.name.input.blur();
		await settle();
		const snapshot = container.getSnapshot();
		expect(snapshot.values['name']).toBe('Ada');
		expect(snapshot.touched['name']).toBe(true);
		expect(seen.some((one) => one.touched['name'] && one.values['name'] !== 'Ada')).toBe(false);
		expect(seen.some((one) => !one.touched['name'] && one.values['name'] === 'Ada')).toBe(false);
	});

	test('blur validates in onBlur mode and the field shows the formatted rule identity', async () => {
		const { container, fields } = await mount();
		fields.name.input.focus();
		fields.name.input.blur();
		await settle();
		expect(container.getSnapshot().errors['name']?.ruleId).toBe('name-required');
		expect(fields.name.error.textContent).toBe('name|validation:required:name-required');
	});

	test('native required on a marked input reaches the container as a native issue, with its params', async () => {
		const { container, nativeForm, fields } = await mount();
		nativeForm.requestSubmit();
		await settle();
		const error = container.getSnapshot().errors['email'];
		expect(error?.all.map((issue) => `${issue.source}:${issue.type}`)).toContain('native:valueMissing');
		expect(fields.email.error.textContent).toBe('email|native:valueMissing:-');
		await userEvent.fill(fields.email.input, 'ada@x.io');
		await settle();
		expect(container.getSnapshot().errors['email']).toBeUndefined();
	});

	test('a submit with an edit during validation submits what passed, and a server error lands on the submitted row', async () => {
		const { container, nativeForm, fields, submissions, submission } = await mount();
		type(fields.name.input, 'Ada');
		type(fields.email.input, 'ada@x.io');
		await settle();
		gate.hold = true;
		nativeForm.requestSubmit();
		await settle();
		expect(container.getSnapshot().isValidating).toBe(true);
		type(fields.name.input, 'Ada Lovelace');
		await settle();
		gate.hold = false;
		for (const release of gate.pending.splice(0)) release();
		await settle(50);
		for (const release of gate.pending.splice(0)) release();
		await settle(50);
		const last = submissions.at(-1);
		expect(last?.passed).toBe(true);
		expect(last?.values['name']).toBe('Ada Lovelace');

		container.fieldArray('contacts').swap(0, 1);
		await settle();
		container.setErrors(
			'server',
			{ 'contacts.0.email': { type: 'bounced' }, [FORM_ROOT]: { type: 'rejected' } },
			{ submission: submission() },
		);
		await settle();
		const errors = container.getSnapshot().errors;
		expect(errors['contacts.1.email']?.type).toBe('bounced');
		expect(errors['contacts.0.email']).toBeUndefined();
		expect(fields.second.error.textContent).toBe('contacts.1.email|server:bounced:-');
	});

	test('reset rewrites the controls and clears every issue', async () => {
		const { container, nativeForm, fields } = await mount();
		type(fields.name.input, 'Ada');
		nativeForm.requestSubmit();
		await settle();
		expect(Object.keys(container.getSnapshot().errors).length).toBeGreaterThan(0);
		nativeForm.reset();
		await settle(50);
		expect(fields.name.input.value).toBe('');
		expect(container.getSnapshot().errors).toEqual({});
	});

	test('a row swap and a row removal keep each control with its row, its fact and its error', async () => {
		const { container, fields } = await mount({ validationMode: 'onChange' });
		type(fields.first.input, '');
		await settle();
		expect(container.getSnapshot().errors['contacts.0.email']?.ruleId).toBe('contact-required');
		container.fieldArray('contacts').swap(0, 1);
		await settle();
		expect(fields.first.input.value).toBe('b@x.io');
		expect(fields.second.input.value).toBe('');
		expect(container.getSnapshot().errors['contacts.1.email']?.ruleId).toBe('contact-required');
		expect(container.getSnapshot().errors['contacts.0.email']).toBeUndefined();
		container.fieldArray('contacts').remove(1);
		fields.second.field.remove();
		await settle();
		expect(container.getSnapshot().values['contacts']).toEqual([{ email: 'b@x.io', role: 'b' }]);
		expect(container.getSnapshot().errors['contacts.1.email']).toBeUndefined();
	});
});
