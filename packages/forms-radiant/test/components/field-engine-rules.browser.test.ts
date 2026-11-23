import { afterEach, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@schema-engine/forms';
import { EmailRuleSchema, type EmailRule, type ValidationRegistration } from '@schema-engine/forms/schemas/validation';
import { InputElementRegistration } from '@/elements/inputs/form-input.registration';
import { FormFieldElement } from '@/elements/form-field';
import { FormRendererElement } from '@/components/internals/form-renderer.script';

afterEach(() => document.body.replaceChildren());

function engineRequiring(domain: string) {
	const email: ValidationRegistration<EmailRule> = {
		$type: 'email',
		schema: EmailRuleSchema,
		metadata: { name: 'Email' },
		category: 'string',
		handler: () => z.optional(z.string().check(z.refine((value) => value.endsWith(domain), `Use ${domain}`))),
		defaultFor: ['input'],
	};
	return createFormEngine({ elements: [{ ...InputElementRegistration, validations: [email] }] });
}

async function validate(field: FormFieldElement, value: string) {
	const { validate: validator } = field.rules ?? {};
	const validators = typeof validator === 'function' ? [validator] : Object.values(validator ?? {});
	if (!validators.length) throw new Error(`The field has no validator: ${JSON.stringify(field.rules)}`);
	for (const run of validators) {
		const result = await run(value, { work: value });
		if (result !== true) return result;
	}
	return true;
}

function mountField() {
	const renderer = document.createElement('se-form-renderer') as FormRendererElement;
	const field = document.createElement('se-field') as FormFieldElement;
	field.setAttribute('name', 'work');
	field.setAttribute('data-se-validation-rules', JSON.stringify([{ type: 'email' }]));
	renderer.append(field);
	document.body.append(renderer);
	return { renderer, field };
}

test('a field validates with the engine bound to its renderer, and with its replacement', async () => {
	const { renderer, field } = mountField();
	renderer.engine = engineRequiring('@a.test');
	await expect.poll(() => validate(field, 'x@b.test')).toBe('email');
	expect(await validate(field, 'x@a.test')).toBe(true);

	renderer.engine = engineRequiring('@b.test');

	await expect.poll(() => validate(field, 'x@b.test')).toBe(true);
	expect(await validate(field, 'x@a.test')).toBe('email');
});

test('a hand-written validator survives the replacement of the engine', async () => {
	const { renderer, field } = mountField();
	field.rules = { validate: { custom: (value) => (String(value).startsWith('no') ? 'Not that' : true) } };
	renderer.engine = engineRequiring('@a.test');
	await expect.poll(() => typeof field.rules?.validate).toBe('object');

	renderer.engine = engineRequiring('@b.test');

	await expect.poll(async () => (await validate(field, 'x@a.test')) === true).toBe(false);
	expect(await validate(field, 'no@b.test')).toBe('Not that');
});

test('a field connected to an already bound engine drops the first engine validator when the engine is replaced', async () => {
	const renderer = document.createElement('se-form-renderer') as FormRendererElement;
	renderer.engine = engineRequiring('@a.test');
	const field = document.createElement('se-field') as FormFieldElement;
	field.setAttribute('name', 'work');
	field.setAttribute('data-se-validation-rules', JSON.stringify([{ type: 'email' }]));
	document.body.append(renderer);
	await expect.poll(() => renderer.provider.getContext().engine).toBeDefined();
	renderer.append(field);
	expect(typeof field.rules?.validate).toBe('function');
	await expect.poll(() => validate(field, 'x@b.test')).toBe('email');

	renderer.engine = engineRequiring('@b.test');

	await expect.poll(() => validate(field, 'x@b.test')).toBe(true);
	expect(await validate(field, 'x@a.test')).toBe('email');
});

test('a client-rendered derived validator stays a single function when the engine arrives', async () => {
	const { renderer, field } = mountField();
	const rendered = () => true;
	field.rules = { validate: rendered };

	renderer.engine = engineRequiring('@a.test');

	await expect.poll(() => field.rules?.validate).not.toBe(rendered);
	expect(typeof field.rules?.validate).toBe('function');
	expect(await validate(field, 'x@b.test')).toBe('email');
});
