import * as z from 'zod/mini';
import { isValidPhoneNumber } from 'libphonenumber-js/min';
import type { PhoneRule, ValidationRegistration } from '@schema-engine/forms/schemas/validation';

export function createPhoneValidationRegistration(): ValidationRegistration<PhoneRule> {
	return {
		type: 'phone',
		category: 'string',
		handler: (rule) =>
			z.optional(z.string()).check(
				z.refine((value) => value === undefined || value === '' || isValidPhoneNumber(value), {
					message: rule.message || 'Enter a complete phone number',
				}),
			),
		defaultFor: ['phone-input'],
	};
}
