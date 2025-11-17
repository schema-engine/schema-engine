import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const TextareaFieldExtensionSchema = z.object({
	rows: z.number().positive().optional(),
	cols: z.number().positive().optional(),
	resize: z.enum(['none', 'both', 'horizontal', 'vertical']).optional(),
	spellCheck: z.boolean().optional(),
	wrap: z.enum(['hard', 'soft']).optional(),
});

export const TextareaFieldSchema = BaseFieldSchema.extend({
	$type: z.literal('textarea'),
	...TextareaFieldExtensionSchema.shape,
});

export type TextareaFieldConfig = z.infer<typeof TextareaFieldSchema>;

export type TextareaFieldProps = TextareaFieldConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};

export const textareaFieldExample: TextareaFieldConfig = {
	$type: 'textarea',
	name: 'exampleField',
	label: 'Example Textarea',
	description: 'This is an example textarea field',
	placeholder: 'Enter your text here...',
	rows: 5,
	spellCheck: true,
};
