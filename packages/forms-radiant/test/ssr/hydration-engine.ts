import * as z from 'zod/mini';
import { createFormEngine } from '@schema-engine/forms';
import type { EmailRule, ValidationRegistration } from '@schema-engine/forms/schemas/validation';
import { InputElementRegistration } from '@/elements/inputs/form-input.registration';
import { PhoneInputElementRegistration } from '@/elements/inputs/form-phone-input.registration';

const emailForInputs: ValidationRegistration<EmailRule> = {
	type: 'email',
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
 */
export function createHydrationEngine() {
	return createFormEngine({
		elements: [{ ...InputElementRegistration, validations: [emailForInputs] }, PhoneInputElementRegistration],
	});
}
