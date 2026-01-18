import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const InputFieldExtensionSchema = z.object({
	inputType: z.enum(['text', 'email', 'password', 'url', 'tel', 'search', 'date']).default('text'),
	autoComplete: z.string().optional(),
	autoFocus: z.boolean().optional(),
	inputMode: z.enum(['none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url']).optional(),
	spellCheck: z.boolean().optional(),
});

export const InputFieldSchema = BaseFieldSchema.extend({
	$type: z.literal('input'),
	...InputFieldExtensionSchema.shape,
});

export type InputFieldConfig = z.infer<typeof InputFieldSchema>;

export type InputFieldProps = InputFieldConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};

export const inputFieldExample: InputFieldConfig = {
	$type: 'input',
	name: 'exampleField',
	label: 'Example Input',
	description: 'This is an example input field',
	inputType: 'text',
	placeholder: 'Enter your text here...',
	autoComplete: 'off',
	spellCheck: true,
};
