import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const SliderFieldExtensionSchema = z.object({
	min: z.number().optional().default(0),
	max: z.number().optional().default(100),
	step: z.number().optional().default(1),
	autoFocus: z.boolean().optional(),
	orientation: z.enum(['horizontal', 'vertical']).default('horizontal').optional(),
});

export const SliderFieldConfigSchema = BaseFieldSchema.extend({
	$type: z.literal('slider'),
	...SliderFieldExtensionSchema.shape,
});

export type SliderFieldExtension = z.infer<typeof SliderFieldExtensionSchema>;
export type SliderFieldConfig = z.infer<typeof SliderFieldConfigSchema>;

export type SliderFieldProps = SliderFieldConfig & {
	onChange?: (value: number) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
