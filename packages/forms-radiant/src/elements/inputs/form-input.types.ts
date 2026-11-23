import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms';

export const InputFieldExtensionSchema = z.object({
	inputType: z._default(z.enum(['text', 'email', 'password', 'url', 'tel', 'search', 'date']), 'text'),
	autoComplete: z.optional(z.string()),
	autoFocus: z.optional(z.boolean()),
	inputMode: z.optional(z.enum(['none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url'])),
	spellCheck: z.optional(z.boolean()),
});

export const InputFieldSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('input'),
	...InputFieldExtensionSchema.shape,
});

export type InputFieldConfig = z.input<typeof InputFieldSchema>;
export type InputFieldOutput = z.output<typeof InputFieldSchema>;

export type InputFieldProps = InputFieldOutput;

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

/** The value an input writes: its text. */
export const inputFieldValue = () => z.string();
