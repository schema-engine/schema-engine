import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms';

export const CheckboxFieldExtensionSchema = z.object({
	autoFocus: z.optional(z.boolean()),
	checked: z.optional(z.boolean()),
	indeterminate: z.optional(z.boolean()),
	form: z.optional(z.string()),
});

export const CheckboxFieldConfigSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('checkbox'),
	...CheckboxFieldExtensionSchema.shape,
});

export type CheckboxFieldExtension = z.infer<typeof CheckboxFieldExtensionSchema>;
export type CheckboxFieldConfig = z.infer<typeof CheckboxFieldConfigSchema>;

export type CheckboxFieldProps = CheckboxFieldConfig;

/** The value a checkbox writes: whether it is checked. */
export const checkboxFieldValue = () => z.boolean();
