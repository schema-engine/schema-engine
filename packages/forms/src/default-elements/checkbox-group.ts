import * as z from 'zod/mini';
import { BaseFieldSchema } from '@/schemas/base-field.js';
import { defineInputContract } from './define-contract.js';

export const CheckboxGroupOptionSchema = z.object({
	value: z.union([z.string(), z.number()]),
	label: z.string(),
	disabled: z.optional(z.boolean()),
});

export const CheckboxGroupFieldExtensionSchema = z.object({
	options: z.array(CheckboxGroupOptionSchema).check(z.describe('Available options for the checkbox group')),
	autoFocus: z.optional(z.boolean()),
	orientation: z.optional(z._default(z.enum(['horizontal', 'vertical']), 'vertical')),
});

export const CheckboxGroupFieldConfigSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('checkbox-group'),
	...CheckboxGroupFieldExtensionSchema.shape,
});

export type CheckboxGroupOption = z.infer<typeof CheckboxGroupOptionSchema>;
export type CheckboxGroupFieldExtension = z.infer<typeof CheckboxGroupFieldExtensionSchema>;
export type CheckboxGroupFieldConfig = z.infer<typeof CheckboxGroupFieldConfigSchema>;

/** The value a checkbox group writes: the values of the checked options, as the options declare them. */
export const checkboxGroupFieldValue = (config: Pick<CheckboxGroupFieldConfig, 'options'>) =>
	z.array(z.literal(config.options.map((option) => option.value)));

/** The contract of the `checkbox-group` element: what every renderer of it agrees on. */
export const CheckboxGroupElementContract = defineInputContract({
	$type: 'checkbox-group',
	appearanceAxes: ['size'],
	schema: CheckboxGroupFieldConfigSchema,
	value: checkboxGroupFieldValue,
	metadata: {
		name: 'Checkbox Group Field',
		description: 'Multiple checkbox field for selecting multiple options',
		category: 'input',
	},
});
