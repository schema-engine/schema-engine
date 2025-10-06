import { z } from 'zod';
import { BaseFieldSchema } from '@json-form-engine/core/schemas/base-field';

/**
 * Switch field extension schema - defines switch-specific properties
 * Validation is handled through the rules property on the base field
 */
export const SwitchFieldExtensionSchema = z.object({
	autoFocus: z.boolean().optional(),
	size: z.enum(['sm', 'md', 'lg']).optional(),
});

/**
 * Complete switch field configuration schema
 */
export const SwitchFieldConfigSchema = BaseFieldSchema.extend({
	componentId: z.literal('switch'),
	...SwitchFieldExtensionSchema.shape,
});

/**
 * Inferred types from schemas
 */
export type SwitchFieldExtension = z.infer<typeof SwitchFieldExtensionSchema>;
export type SwitchFieldConfig = z.infer<typeof SwitchFieldConfigSchema>;

/**
 * Global registration for extensible field system
 */
declare module '@json-form-engine/core/schemas/field-config' {
	namespace FormEngine {
		interface FieldConfigRegistry {
			switch: SwitchFieldConfig;
		}
	}
}
