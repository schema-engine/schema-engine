import * as z from 'zod/mini';
import { BaseFieldSchema } from '@/schemas/base-field';
import { defineInputContract } from './define-contract';

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

/** The phone-input configuration after validation, which its render function receives. */
export type PhoneInputFieldOutput = z.output<typeof PhoneInputFieldSchema>;

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

/** The contract of the `phone-input` element: what every renderer of it agrees on. */
export const PhoneInputElementContract = defineInputContract({
	$type: 'phone-input',
	appearanceAxes: ['size'],
	schema: PhoneInputFieldSchema,
	value: phoneInputFieldValue,
	metadata: {
		name: 'Phone Input',
		description: 'International phone number input with country selection',
		category: 'input',
	},
});
