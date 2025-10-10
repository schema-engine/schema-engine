import { z } from 'zod';
import { BaseFieldSchema } from '@json-form-engine/core/schemas/base-field';

/**
 * Number field extension schema - defines number-specific properties
 * Validation is handled through the rules property on the base field
 */
export const NumberFieldExtensionSchema = z.object({
	min: z.number().optional(),
	max: z.number().optional(),
	step: z.number().optional(),
	autoComplete: z.string().optional(),
	autoFocus: z.boolean().optional(),
	inputMode: z.enum(['none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url']).optional(),
});

/**
 * Complete number field configuration schema
 */
export const NumberFieldConfigSchema = BaseFieldSchema.extend({
	componentId: z.literal('number'),
	...NumberFieldExtensionSchema.shape,
});

/**
 * Inferred types from schemas
 */
export type NumberFieldExtension = z.infer<typeof NumberFieldExtensionSchema>;
export type NumberFieldConfig = z.infer<typeof NumberFieldConfigSchema>;

/**
 * Global registration for extensible field system
 */
declare module '@json-form-engine/core/schemas/field-config' {
	namespace FormEngine {
		interface FieldConfigRegistry {
			number: NumberFieldConfig;
		}
	}
}
