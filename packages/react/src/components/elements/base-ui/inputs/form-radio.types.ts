import { z } from 'zod';
import { BaseFieldSchema } from '@json-form-engine/core/schemas/base-field';

export const RadioOptionSchema = z.object({
	value: z.union([z.string(), z.number()]),
	label: z.string(),
	disabled: z.boolean().optional(),
});

export const RadioFieldExtensionSchema = z.object({
	options: z.array(RadioOptionSchema).describe('Available options for the radio field'),
	autoFocus: z.boolean().optional(),
	orientation: z.enum(['horizontal', 'vertical']).default('vertical').optional(),
});

export const RadioFieldConfigSchema = BaseFieldSchema.extend({
	$type: z.literal('radio'),
	...RadioFieldExtensionSchema.shape,
});

export type RadioOption = z.infer<typeof RadioOptionSchema>;
export type RadioFieldExtension = z.infer<typeof RadioFieldExtensionSchema>;
export type RadioFieldConfig = z.infer<typeof RadioFieldConfigSchema>;

export type RadioFieldProps = RadioFieldConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
