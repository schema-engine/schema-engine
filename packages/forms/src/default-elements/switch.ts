import * as z from 'zod/mini';
import { BaseFieldSchema } from '../schemas/base-field.js';
import { defineInputContract } from './define-contract.js';

export const SwitchFieldExtensionSchema = z.object({
	autoFocus: z.optional(z.boolean()),
	size: z.optional(z.enum(['sm', 'md', 'lg'])),
});

export const SwitchFieldConfigSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('switch'),
	...SwitchFieldExtensionSchema.shape,
});

export type SwitchFieldExtension = z.infer<typeof SwitchFieldExtensionSchema>;
export type SwitchFieldConfig = z.infer<typeof SwitchFieldConfigSchema>;

/** The value a switch writes: whether it is on. */
export const switchFieldValue = () => z.boolean();

/** The contract of the `switch` element: what every renderer of it agrees on. */
export const SwitchElementContract = defineInputContract({
	$type: 'switch',
	appearanceAxes: ['size'],
	schema: SwitchFieldConfigSchema,
	value: switchFieldValue,
	metadata: {
		name: 'Switch Field',
		description: 'Toggle switch field for boolean values',
		category: 'input',
	},
});
