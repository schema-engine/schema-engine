import { z } from 'zod';
import { BaseFieldSchema } from '@json-form-engine/core/schemas/base-field';

export const CheckboxFieldExtensionSchema = z.object({
	autoFocus: z.boolean().optional(),
	checked: z.boolean().optional(),
	indeterminate: z.boolean().optional(),
	form: z.string().optional(),
});

export const CheckboxFieldConfigSchema = BaseFieldSchema.extend({
	__id: z.literal('checkbox'),
	...CheckboxFieldExtensionSchema.shape,
});

export type CheckboxFieldExtension = z.infer<typeof CheckboxFieldExtensionSchema>;
export type CheckboxFieldConfig = z.infer<typeof CheckboxFieldConfigSchema>;

export type CheckboxFieldProps = CheckboxFieldConfig & {
	onChange?: (checked: boolean | 'indeterminate') => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
