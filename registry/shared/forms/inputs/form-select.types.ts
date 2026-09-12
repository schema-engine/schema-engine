import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const SelectOptionSchema = z.object({
	value: z.union([z.string(), z.number()]),
	label: z.string(),
	disabled: z.optional(z.boolean()),
});

export const SelectFieldExtensionSchema = z.object({
	options: z.array(SelectOptionSchema).check(z.describe('Available options for the select field')),
	multiple: z.optional(z.boolean()),
	autoComplete: z.optional(z.string()),
	autoFocus: z.optional(z.boolean()),
	size: z.optional(z.number()),
});

export const SelectFieldConfigSchema = z.extend(BaseFieldSchema, {
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
