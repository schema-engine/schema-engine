import * as z from 'zod/mini';
import { createFormEngine, defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas';
import { BaseValidationRuleSchema, type ValidationRegistration } from '@schema-engine/forms/schemas/validation';

type PostalCodeRule = { type: 'postalCode'; message?: string };

export const postalCode: ValidationRegistration<PostalCodeRule> = {
	$type: 'postalCode',
	schema: z.looseObject({ type: z.literal('postalCode') }),
	metadata: { name: 'Postal code' },
	category: 'string',
	handler: () => z.string().check(z.regex(/^\d{5}(?:-\d{4})?$/)),
};

const addressTextRegistration = defineInput({
	$type: 'text',
	schema: z.extend(BaseFieldSchema, {
		$type: z.literal('text'),
		rules: z.optional(z.array(BaseValidationRuleSchema)),
	}),
	metadata: { name: 'Text', category: 'input' },
	render: () => null,
});

export const addressEngine = createFormEngine({ elements: [addressTextRegistration], validations: [postalCode] });

export const addressForm = addressEngine.defineForm({
	id: 'address',
	steps: [
		{
			id: 'main',
			title: 'Address',
			elements: [
				{ $type: 'text', name: 'postalCode', rules: [{ type: 'postalCode', message: 'Enter a postal code' }] },
			],
		},
	],
});
