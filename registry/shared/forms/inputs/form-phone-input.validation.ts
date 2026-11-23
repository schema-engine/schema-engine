import * as z from 'zod/mini';
import { isValidPhoneNumber } from 'libphonenumber-js/min';
import { PhoneRuleSchema, type PhoneRule, type ValidationRegistration } from '@schema-engine/forms';

export function createPhoneValidationRegistration(): ValidationRegistration<PhoneRule> {
	return {
		$type: 'phone',
		schema: PhoneRuleSchema,
		metadata: { name: 'Phone', description: 'The text is a complete phone number.' },
		category: 'string',
		handler: (rule) =>
			z.optional(z.string()).check(
				z.refine((value) => value === undefined || value === '' || isValidPhoneNumber(value), {
					message: rule.message,
				}),
			),
		defaultFor: ['phone-input'],
	};
}
