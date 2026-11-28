import * as z from 'zod/mini';
import { BaseFieldSchema } from '../schemas/base-field.js';
import { defineInputContract } from './define-contract.js';

export const CheckboxFieldExtensionSchema = z.object({
	autoFocus: z.optional(z.boolean()),
	checked: z.optional(z.boolean()),
	indeterminate: z.optional(z.boolean()),
	form: z.optional(z.string()),
});

export const CheckboxFieldConfigSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('checkbox'),
	...CheckboxFieldExtensionSchema.shape,
});

export type CheckboxFieldExtension = z.infer<typeof CheckboxFieldExtensionSchema>;
export type CheckboxFieldConfig = z.infer<typeof CheckboxFieldConfigSchema>;

/** The value a checkbox writes: whether it is checked. */
export const checkboxFieldValue = () => z.boolean();

/** The contract of the `checkbox` element: what every renderer of it agrees on. */
export const CheckboxElementContract = defineInputContract({
	$type: 'checkbox',
	appearanceAxes: ['size'],
	schema: CheckboxFieldConfigSchema,
	value: checkboxFieldValue,
	metadata: {
		name: 'Checkbox Field',
		description: 'Checkbox input field for boolean values',
		category: 'input',
	},
});
