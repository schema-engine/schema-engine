import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const PhoneInputFieldExtensionSchema = z.object({
	defaultCountry: z.optional(z.string()),
	international: z.optional(z.boolean()),
});

export const PhoneInputFieldSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('phone-input'),
	...PhoneInputFieldExtensionSchema.shape,
});

/** Serializable input accepted by the phone-input registration. */
export type PhoneInputFieldConfig = z.input<typeof PhoneInputFieldSchema>;

export type PhoneInputFieldProps = z.output<typeof PhoneInputFieldSchema>;

export const phoneInputFieldExample: PhoneInputFieldConfig = {
	$type: 'phone-input',
	name: 'phoneNumber',
	label: 'Phone Number',
	description: 'Enter your phone number',
	defaultCountry: 'US',
	placeholder: 'Enter phone number',
};

/** The value a phone field writes: the number as text. */
export const phoneInputFieldValue = () => z.string();
