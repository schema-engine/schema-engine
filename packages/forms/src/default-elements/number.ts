import * as z from 'zod/mini';
import { BaseFieldSchema } from '@/schemas/base-field.js';
import { defineInputContract } from './define-contract.js';

export const NumberFieldExtensionSchema = z.object({
	min: z.optional(z.number()),
	max: z.optional(z.number()),
	step: z.optional(z.number()),
	autoComplete: z.optional(z.string()),
	autoFocus: z.optional(z.boolean()),
	inputMode: z.optional(z.enum(['none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url'])),
});

export const NumberFieldConfigSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('number'),
	...NumberFieldExtensionSchema.shape,
});

export type NumberFieldExtension = z.infer<typeof NumberFieldExtensionSchema>;
export type NumberFieldConfig = z.infer<typeof NumberFieldConfigSchema>;

/** The value a number field writes: a number. An empty field writes `''`, which only an optional field may hold. */
export const numberFieldValue = () => z.number();

/** The contract of the `number` element: what every renderer of it agrees on. */
export const NumberElementContract = defineInputContract({
	$type: 'number',
	appearanceAxes: ['size'],
	schema: NumberFieldConfigSchema,
	value: numberFieldValue,
	metadata: {
		name: 'Number Field',
		description: 'Number input field for numeric values',
		category: 'input',
	},
});
