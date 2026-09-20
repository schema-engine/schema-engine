import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const CheckboxGroupOptionSchema = z.object({
	value: z.union([z.string(), z.number()]),
	label: z.string(),
	disabled: z.optional(z.boolean()),
});

export const CheckboxGroupFieldExtensionSchema = z.object({
	options: z.array(CheckboxGroupOptionSchema).check(z.describe('Available options for the checkbox group')),
	autoFocus: z.optional(z.boolean()),
	orientation: z.optional(z._default(z.enum(['horizontal', 'vertical']), 'vertical')),
});

export const CheckboxGroupFieldConfigSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('checkbox-group'),
	...CheckboxGroupFieldExtensionSchema.shape,
});

export type CheckboxGroupOption = z.infer<typeof CheckboxGroupOptionSchema>;
export type CheckboxGroupFieldExtension = z.infer<typeof CheckboxGroupFieldExtensionSchema>;
export type CheckboxGroupFieldConfig = z.infer<typeof CheckboxGroupFieldConfigSchema>;

export type CheckboxGroupFieldProps = CheckboxGroupFieldConfig & {
	onChange?: (value: (string | number)[]) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
