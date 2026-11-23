import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms';

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

export type ComboboxFieldProps = ComboboxFieldConfig;

/** The value a combobox writes: the value of the chosen option, as the option declares it, or a list of them with `multiple`. */
export const comboboxFieldValue = (
	config: Pick<ComboboxFieldConfig, 'options' | 'multiple'>,
): z.ZodMiniType<string | number | Array<string | number>> => {
	const option = z.literal(config.options.map((choice) => choice.value));
	return config.multiple ? z.array(option) : option;
};
