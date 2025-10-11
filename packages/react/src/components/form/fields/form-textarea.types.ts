import { z } from 'zod';
import { BaseFieldSchema } from '@json-form-engine/core/schemas/base-field';

/**
 * Textarea field specific properties schema
 * Only includes serializable props that we want to configure
 * Validation is handled by the rules key in BaseFieldSchema
 */
export const TextareaFieldExtensionSchema = z.object({
	/** Number of visible text lines */
	rows: z.number().positive().optional(),

	/** Number of visible character widths */
	cols: z.number().positive().optional(),

	/** How the textarea can be resized */
	resize: z.enum(['none', 'both', 'horizontal', 'vertical']).optional(),

	/** Spellcheck attribute */
	spellCheck: z.boolean().optional(),

	/** Text wrapping mode */
	wrap: z.enum(['hard', 'soft']).optional(),
});

/**
 * Complete textarea field schema
 */
export const TextareaFieldSchema = BaseFieldSchema.extend({
	__id: z.literal('textarea'),
	...TextareaFieldExtensionSchema.shape,
});

/**
 * Textarea field configuration type
 */
export type TextareaFieldConfig = z.infer<typeof TextareaFieldSchema>;

/**
 * Textarea field component props interface
 * Adds optional handlers for standalone usage
 */
export type TextareaFieldProps = TextareaFieldConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};

/**
 * Example textarea field configuration for documentation
 */
export const textareaFieldExample: TextareaFieldConfig = {
	__id: 'textarea',
	id: 'example-textarea',
	name: 'exampleTextarea',
	label: 'Example Textarea',
	description: 'This is an example textarea field',
	placeholder: 'Enter your text here...',
	rows: 4,
	resize: 'vertical',
	spellCheck: true,
};
