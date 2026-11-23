import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms';

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

export type SelectFieldProps = SelectFieldConfig;

/** The value a select writes: the value of the chosen option, as the option declares it, or a list of them with `multiple`. */
export const selectFieldValue = (
	config: Pick<SelectFieldConfig, 'options' | 'multiple'>,
): z.ZodMiniType<string | number | Array<string | number>> => {
	const option = z.literal(config.options.map((choice) => choice.value));
	return config.multiple ? z.array(option) : option;
};
