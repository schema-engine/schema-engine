import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const PhoneInputFieldExtensionSchema = z.object({
	defaultCountry: z.string().optional(),
	international: z.boolean().optional(),
});

export const PhoneInputFieldSchema = BaseFieldSchema.extend({
	$type: z.literal('phone-input'),
	...PhoneInputFieldExtensionSchema.shape,
});

export type PhoneInputFieldConfig = z.infer<typeof PhoneInputFieldSchema>;

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
