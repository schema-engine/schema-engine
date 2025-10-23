import { z } from 'zod';
import { BaseFieldSchema } from '@json-form-engine/core/schemas/base-field';

export const SelectOptionSchema = z.object({
	value: z.union([z.string(), z.number()]),
	label: z.string(),
	disabled: z.boolean().optional(),
});

export const SelectFieldExtensionSchema = z.object({
	options: z.array(SelectOptionSchema).describe('Available options for the select field'),
	multiple: z.boolean().optional(),
	autoComplete: z.string().optional(),
	autoFocus: z.boolean().optional(),
	size: z.number().optional(),
});

export const SelectFieldConfigSchema = BaseFieldSchema.extend({
	$type: z.literal('select'),
	...SelectFieldExtensionSchema.shape,
});

export type SelectOption = z.infer<typeof SelectOptionSchema>;
export type SelectFieldExtension = z.infer<typeof SelectFieldExtensionSchema>;
export type SelectFieldConfig = z.infer<typeof SelectFieldConfigSchema>;

export type SelectFieldProps = SelectFieldConfig & {
	onChange?: (value: string | string[]) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
