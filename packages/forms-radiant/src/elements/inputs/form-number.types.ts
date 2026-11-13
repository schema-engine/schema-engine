import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const NumberFieldExtensionSchema = z.object({
	min: z.optional(z.number()),
	max: z.optional(z.number()),
	step: z.optional(z.number()),
	autoComplete: z.optional(z.string()),
	autoFocus: z.optional(z.boolean()),
	inputMode: z.optional(z.enum(['none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url'])),
});

export const NumberFieldConfigSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('number'),
	...NumberFieldExtensionSchema.shape,
});

export type NumberFieldExtension = z.infer<typeof NumberFieldExtensionSchema>;
export type NumberFieldConfig = z.infer<typeof NumberFieldConfigSchema>;

export type NumberFieldProps = NumberFieldConfig;
