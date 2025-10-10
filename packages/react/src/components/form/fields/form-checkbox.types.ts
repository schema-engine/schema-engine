import { z } from 'zod';
import { BaseFieldSchema } from '@json-form-engine/core/schemas/base-field';

/**
 * Checkbox field extension schema - defines checkbox-specific properties
 * Validation is handled through the rules property on the base field
 */
export const CheckboxFieldExtensionSchema = z.object({
	autoFocus: z.boolean().optional(),
	checked: z.boolean().optional(),
	indeterminate: z.boolean().optional(),
	form: z.string().optional(),
});

/**
 * Complete checkbox field configuration schema
 */
export const CheckboxFieldConfigSchema = BaseFieldSchema.extend({
	componentId: z.literal('checkbox'),
	...CheckboxFieldExtensionSchema.shape,
});

/**
 * Inferred types from schemas
 */
export type CheckboxFieldExtension = z.infer<typeof CheckboxFieldExtensionSchema>;
export type CheckboxFieldConfig = z.infer<typeof CheckboxFieldConfigSchema>;
