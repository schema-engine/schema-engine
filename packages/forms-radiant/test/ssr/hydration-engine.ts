import * as z from 'zod/mini';
import { createFormEngine, EmailRuleSchema, type EmailRule, type ValidationRegistration } from '@schema-engine/forms';
import { schemaFormRegistrations } from '@/registrations';
import { testAction } from '../adapters/test-actions';

const emailForInputs: ValidationRegistration<EmailRule> = {
	$type: 'email',
	schema: EmailRuleSchema,
	metadata: { name: 'Email' },
	category: 'string',
	handler: (rule) => z.optional(z.string().check(z.refine((value) => !value || value.includes('@'), rule.message))),
	defaultFor: ['input'],
};

/**
 * The engine both sides of the hydration fixture use, with `defaultFor` rules on
 * `input` and `phone-input` that no field authors. An empty value passes both,
 * so the fixture's submission tests are unaffected.
 *
 * @remarks
 * The `submit` action lets a test author an `actions` entry; the fixture form
 * declares none, and a test that runs one passes its own `submit` registration.
 */
export function createHydrationEngine(submit = testAction('submit', ['form_submit'], async () => ({ success: true }))) {
	return createFormEngine({
		elements: schemaFormRegistrations.map((registration) =>
			registration.$type === 'input' ? { ...registration, validations: [emailForInputs] } : registration,
		),
		actions: [submit],
	});
}
