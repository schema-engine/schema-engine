import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const ComboboxOptionSchema = z.object({
	value: z.union([z.string(), z.number()]),
	label: z.string(),
	disabled: z.boolean().optional(),
});

export const ComboboxFieldExtensionSchema = z.object({
	options: z.array(ComboboxOptionSchema).describe('Available options for the combobox field'),
	multiple: z.boolean().optional(),
	autoComplete: z.string().optional(),
	autoFocus: z.boolean().optional(),
});

export const ComboboxFieldConfigSchema = BaseFieldSchema.extend({
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
