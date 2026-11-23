import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const RadioOptionSchema = z.object({
	value: z.union([z.string(), z.number()]),
	label: z.string(),
	disabled: z.optional(z.boolean()),
});

export const RadioFieldExtensionSchema = z.object({
	options: z.array(RadioOptionSchema).check(z.describe('Available options for the radio field')),
	autoFocus: z.optional(z.boolean()),
	orientation: z.optional(z._default(z.enum(['horizontal', 'vertical']), 'vertical')),
});

export const RadioFieldConfigSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('radio'),
	...RadioFieldExtensionSchema.shape,
});

export type RadioOption = z.infer<typeof RadioOptionSchema>;
export type RadioFieldExtension = z.infer<typeof RadioFieldExtensionSchema>;
export type RadioFieldConfig = z.infer<typeof RadioFieldConfigSchema>;

export type RadioFieldProps = RadioFieldConfig & {
	onChange?: (value: RadioOption['value']) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};

/** The value a radio group writes: the value of the chosen option, as the option declares it. */
export const radioFieldValue = (config: Pick<RadioFieldConfig, 'options'>): z.ZodMiniType<string | number> =>
	z.literal(config.options.map((option) => option.value));
