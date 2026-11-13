import * as z from 'zod/mini';
import { createFormEngine } from '@schema-engine/forms';
import { EmailRuleSchema, type EmailRule, type ValidationRegistration } from '@schema-engine/forms/schemas/validation';
import { InputElementRegistration } from '@/elements/inputs/form-input.registration';
import { PhoneInputElementRegistration } from '@/elements/inputs/form-phone-input.registration';
import { testAction } from '../adapters/test-actions';

const emailForInputs: ValidationRegistration<EmailRule> = {
	$type: 'email',
	schema: EmailRuleSchema,
	metadata: { name: 'Email' },
	category: 'string',
	handler: (rule) =>
		z.optional(
			z.string().check(z.refine((value) => !value || value.includes('@'), rule.message ?? 'Enter an email')),
		),
	defaultFor: ['input'],
};

/**
 * The engine both sides of the hydration fixture use, with `defaultFor` rules on
 * `input` and `phone-input` that no field authors. An empty value passes both,
 * so the fixture's submission tests are unaffected.
 *
 * @remarks
 * The `submit` action lets a test author an `actions` entry; the fixture form
 * declares none, and a test that runs one returns its own registration from
 * `getAction`.
 */
export function createHydrationEngine() {
	return createFormEngine({
		elements: [{ ...InputElementRegistration, validations: [emailForInputs] }, PhoneInputElementRegistration],
		actions: [testAction('submit', ['form_submit'], async () => ({ success: true }))],
	});
}
