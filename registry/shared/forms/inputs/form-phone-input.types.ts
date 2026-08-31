import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';
import { ValidationRuleSchema, type ValidationRule } from '@schema-engine/forms/schemas/validation';

export const PhoneInputFieldExtensionSchema = z.object({
	defaultCountry: z.string().optional(),
	international: z.boolean().optional(),
});

export const PhoneInputFieldSchema = BaseFieldSchema.extend({
	$type: z.literal('phone-input'),
	...PhoneInputFieldExtensionSchema.shape,
	rules: z
		.array(ValidationRuleSchema)
		.optional()
		.transform((rules) => {
			if (rules?.some((rule) => rule.type === 'phone')) {
				return rules;
			}

			return [...(rules ?? []), { type: 'phone' as const }];
		}),
});

/** Serializable input accepted by the phone-input registration. */
export type PhoneInputFieldConfig = Omit<z.infer<typeof PhoneInputFieldSchema>, 'rules'> & {
	rules?: ValidationRule[];
};

export type PhoneInputFieldProps = PhoneInputFieldConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};

export const phoneInputFieldExample: PhoneInputFieldConfig = {
	$type: 'phone-input',
	name: 'phoneNumber',
	label: 'Phone Number',
	description: 'Enter your phone number with country code',
	defaultCountry: 'US',
	international: true,
	placeholder: 'Enter phone number',
};
