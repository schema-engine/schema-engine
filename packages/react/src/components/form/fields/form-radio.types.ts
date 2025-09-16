import { z } from 'zod';
import { BaseFieldSchema } from '@json-form-engine/core/schemas/base-field';

/**
 * Option definition for radio fields
 */
export const RadioOptionSchema = z.object({
	value: z.union([z.string(), z.number()]),
	label: z.string(),
	disabled: z.boolean().optional(),
});

/**
 * Radio field extension schema - defines radio-specific properties
 * Validation is handled through the rules property on the base field
 */
export const RadioFieldExtensionSchema = z.object({
	options: z.array(RadioOptionSchema).describe('Available options for the radio field'),
	autoFocus: z.boolean().optional(),
	orientation: z.enum(['horizontal', 'vertical']).default('vertical').optional(),
});

/**
 * Complete radio field configuration schema
 */
export const RadioFieldConfigSchema = BaseFieldSchema.extend({
	componentId: z.literal('radio'),
	...RadioFieldExtensionSchema.shape,
});

/**
 * Inferred types from schemas
 */
export type RadioOption = z.infer<typeof RadioOptionSchema>;
export type RadioFieldExtension = z.infer<typeof RadioFieldExtensionSchema>;
export type RadioFieldConfig = z.infer<typeof RadioFieldConfigSchema>;

/**
 * Global registration for extensible field system
 */
declare global {
	namespace FormEngine {
		interface FieldConfigRegistry {
			radio: RadioFieldConfig;
		}
	}
}
