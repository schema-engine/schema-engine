import { z } from 'zod';
import { BaseFieldSchema } from '@json-form-engine/core/schemas/base-field';

/**
 * Input field specific properties schema
 * Only includes serializable props that we want to configure
 * Validation is handled by the rules key in BaseFieldSchema
 */
export const InputFieldExtensionSchema = z.object({
	/** Input type (text, email, password, etc.) */
	inputType: z.enum(['text', 'email', 'password', 'url', 'tel', 'search']).default('text'),

	/** Autocomplete attribute */
	autoComplete: z.string().optional(),

	/** Whether to auto-focus this field */
	autoFocus: z.boolean().optional(),

	/** Input mode for mobile keyboards */
	inputMode: z.enum(['none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url']).optional(),

	/** Spellcheck attribute */
	spellCheck: z.boolean().optional(),
});

/**
 * Complete input field schema
 */
export const InputFieldSchema = BaseFieldSchema.extend({
	__id: z.literal('input'),
	...InputFieldExtensionSchema.shape,
});

/**
 * Input field configuration type
 */
export type InputFieldConfig = z.infer<typeof InputFieldSchema>;

/**
 * Input field component props interface
 * Adds optional handlers for standalone usage
 */
export type InputFieldProps = InputFieldConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};

/**
 * Example input field configuration for documentation
 */
export const inputFieldExample: InputFieldConfig = {
	__id: 'input',
	name: 'exampleField',
	label: 'Example Input',
	description: 'This is an example input field',
	inputType: 'text',
	placeholder: 'Enter your text here...',
	autoComplete: 'off',
	spellCheck: true,
};
