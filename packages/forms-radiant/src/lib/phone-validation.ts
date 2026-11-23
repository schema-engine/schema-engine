import * as z from 'zod/mini';
import { PhoneRuleSchema, type PhoneRule, type ValidationRegistration } from '@schema-engine/forms/schemas/validation';
import { loadLibphonenumber } from './phone-number';

/**
 * Creates an asynchronous validator that loads phone metadata only when validation runs.
 */
function createRadiantPhoneValidationSchema(rule: PhoneRule): z.ZodMiniType {
	return z.optional(z.string()).check(
		z.superRefine(async (value, ctx) => {
			if (value === undefined || value === '') {
				return;
			}

			const lib = await loadLibphonenumber();
			if (!lib.isValidPhoneNumber(value)) {
				ctx.addIssue({
					code: 'custom',
					message: rule.message,
				});
			}
		}),
	);
}

export function createRadiantPhoneValidationRegistration(): ValidationRegistration<PhoneRule> {
	return {
		$type: 'phone',
		schema: PhoneRuleSchema,
		metadata: { name: 'Phone', description: 'The text is a complete phone number.' },
		category: 'string',
		handler: createRadiantPhoneValidationSchema,
		defaultFor: ['phone-input'],
	};
}
