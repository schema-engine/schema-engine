import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const SliderFieldExtensionSchema = z.object({
	min: z._default(z.optional(z.number()), 0),
	max: z._default(z.optional(z.number()), 100),
	step: z._default(z.optional(z.number()), 1),
	autoFocus: z.optional(z.boolean()),
	orientation: z.optional(z._default(z.enum(['horizontal', 'vertical']), 'horizontal')),
});

export const SliderFieldConfigSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('slider'),
	...SliderFieldExtensionSchema.shape,
});

export type SliderFieldExtension = z.infer<typeof SliderFieldExtensionSchema>;
export type SliderFieldConfig = z.infer<typeof SliderFieldConfigSchema>;

export type SliderFieldProps = SliderFieldConfig;

/** The value a slider writes: a number between its `min` and `max`. */
export const sliderFieldValue = (config: Pick<SliderFieldConfig, 'min' | 'max'>) =>
	z.number().check(z.gte(config.min), z.lte(config.max));
