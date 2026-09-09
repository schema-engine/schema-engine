import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const ComboboxOptionSchema = z.object({
	value: z.union([z.string(), z.number()]),
	label: z.string(),
	disabled: z.optional(z.boolean()),
});

export const ComboboxFieldExtensionSchema = z.object({
	options: z.array(ComboboxOptionSchema).check(z.describe('Available options for the combobox field')),
	multiple: z.optional(z.boolean()),
	autoComplete: z.optional(z.string()),
	autoFocus: z.optional(z.boolean()),
});

export const ComboboxFieldConfigSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('combobox'),
	...ComboboxFieldExtensionSchema.shape,
});

export type ComboboxOption = z.infer<typeof ComboboxOptionSchema>;
export type ComboboxFieldExtension = z.infer<typeof ComboboxFieldExtensionSchema>;
export type ComboboxFieldConfig = z.infer<typeof ComboboxFieldConfigSchema>;

export type ComboboxFieldProps = ComboboxFieldConfig & {
	onChange?: (value: string | string[]) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
