import * as z from 'zod/mini';
import { BaseFieldSchema } from '@/schemas/base-field';
import { defineInputContract } from './define-contract';

export const TextareaFieldExtensionSchema = z.object({
	rows: z.optional(z.number().check(z.positive())),
	cols: z.optional(z.number().check(z.positive())),
	resize: z.optional(z.enum(['none', 'both', 'horizontal', 'vertical'])),
	spellCheck: z.optional(z.boolean()),
	wrap: z.optional(z.enum(['hard', 'soft'])),
});

export const TextareaFieldSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('textarea'),
	...TextareaFieldExtensionSchema.shape,
});

export type TextareaFieldConfig = z.infer<typeof TextareaFieldSchema>;

export const textareaFieldExample: TextareaFieldConfig = {
	$type: 'textarea',
	name: 'exampleField',
	label: 'Example Textarea',
	description: 'This is an example textarea field',
	placeholder: 'Enter your text here...',
	rows: 5,
	spellCheck: true,
};

/** The value a textarea writes: its text. */
export const textareaFieldValue = () => z.string();

/** The contract of the `textarea` element: what every renderer of it agrees on. */
export const TextareaElementContract = defineInputContract({
	$type: 'textarea',
	appearanceAxes: ['size'],
	schema: TextareaFieldSchema,
	value: textareaFieldValue,
	metadata: {
		name: 'Textarea Field',
		description: 'Multi-line text input field',
		category: 'input',
	},
});
