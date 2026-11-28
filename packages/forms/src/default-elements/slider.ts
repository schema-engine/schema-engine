import * as z from 'zod/mini';
import { BaseFieldSchema } from '../schemas/base-field.js';
import { defineInputContract } from './define-contract.js';

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

/** The value a slider writes: a number between its `min` and `max`. */
export const sliderFieldValue = (config: Pick<SliderFieldConfig, 'min' | 'max'>) =>
	z.number().check(z.gte(config.min ?? 0), z.lte(config.max ?? 100));

/** The contract of the `slider` element: what every renderer of it agrees on. */
export const SliderElementContract = defineInputContract({
	$type: 'slider',
	appearanceAxes: ['size'],
	schema: SliderFieldConfigSchema,
	value: sliderFieldValue,
	metadata: {
		name: 'Slider Field',
		description: 'Slider input field for selecting a numeric value within a range',
		category: 'input',
	},
});
