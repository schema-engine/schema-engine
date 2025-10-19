import { z } from 'zod';
import { BaseFieldSchema } from '@json-form-engine/core/schemas/base-field';

export const NumberFieldExtensionSchema = z.object({
	min: z.number().optional(),
	max: z.number().optional(),
	step: z.number().optional(),
	autoComplete: z.string().optional(),
	autoFocus: z.boolean().optional(),
	inputMode: z.enum(['none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url']).optional(),
});

export const NumberFieldConfigSchema = BaseFieldSchema.extend({
	$type: z.literal('number'),
	...NumberFieldExtensionSchema.shape,
});

export type NumberFieldExtension = z.infer<typeof NumberFieldExtensionSchema>;
export type NumberFieldConfig = z.infer<typeof NumberFieldConfigSchema>;

export type NumberFieldProps = NumberFieldConfig & {
	onChange?: (value: number | '') => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
