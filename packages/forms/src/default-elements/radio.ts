import * as z from 'zod/mini';
import { BaseFieldSchema } from '../schemas/base-field.js';
import { defineInputContract } from './define-contract.js';

export const RadioOptionSchema = z.object({
	value: z.union([z.string(), z.number()]),
	label: z.string(),
	disabled: z.optional(z.boolean()),
});

export const RadioFieldExtensionSchema = z.object({
	options: z.array(RadioOptionSchema).check(z.describe('Available options for the radio field')),
	autoFocus: z.optional(z.boolean()),
	orientation: z.optional(z._default(z.enum(['horizontal', 'vertical']), 'vertical')),
});

export const RadioFieldConfigSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('radio'),
	...RadioFieldExtensionSchema.shape,
});

export type RadioOption = z.infer<typeof RadioOptionSchema>;
export type RadioFieldExtension = z.infer<typeof RadioFieldExtensionSchema>;
export type RadioFieldConfig = z.infer<typeof RadioFieldConfigSchema>;

/** The value a radio group writes: the value of the chosen option, as the option declares it. */
export const radioFieldValue = (config: Pick<RadioFieldConfig, 'options'>): z.ZodMiniType<string | number> =>
	z.literal(config.options.map((option) => option.value));

/** The contract of the `radio` element: what every renderer of it agrees on. */
export const RadioElementContract = defineInputContract({
	$type: 'radio',
	appearanceAxes: ['size'],
	schema: RadioFieldConfigSchema,
	value: radioFieldValue,
	metadata: {
		name: 'Radio Field',
		description: 'Radio button field for single selection from multiple options',
		category: 'input',
	},
});
