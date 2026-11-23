import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

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

/** The value a textarea writes: its text. */
export const textareaFieldValue = () => z.string();
