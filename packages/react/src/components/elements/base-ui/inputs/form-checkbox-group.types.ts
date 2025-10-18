import { z } from 'zod';
import { BaseFieldSchema } from '@json-form-engine/core/schemas/base-field';

export const CheckboxGroupOptionSchema = z.object({
	value: z.union([z.string(), z.number()]),
	label: z.string(),
	disabled: z.boolean().optional(),
});

export const CheckboxGroupFieldExtensionSchema = z.object({
	options: z.array(CheckboxGroupOptionSchema).describe('Available options for the checkbox group'),
	autoFocus: z.boolean().optional(),
	orientation: z.enum(['horizontal', 'vertical']).default('vertical').optional(),
});

export const CheckboxGroupFieldConfigSchema = BaseFieldSchema.extend({
	__id: z.literal('checkbox-group'),
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
