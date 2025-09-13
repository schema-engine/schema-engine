import { z } from 'zod';
import { BaseFieldSchema } from '../../../schemas/base-field';

/**
 * Array field extension schema - defines array-specific properties
 * Validation is handled through the rules property on the base field
 */
export const ArrayElementsExtensionSchema = z.object({
	minItems: z.number().min(0).optional().describe('Minimum number of items allowed'),
	maxItems: z.number().min(1).optional().describe('Maximum number of items allowed'),
	addButtonText: z.string().optional().describe('Text for the add button'),
	removeButtonText: z.string().optional().describe('Text for the remove button'),
	get elements() {
		return z.array(BaseFieldSchema).min(1).describe('Field definitions for each item in the array');
	},
});

/**
 * Complete array field configuration schema
 */
export const ArrayElementConfigSchema = BaseFieldSchema.extend({
	componentId: z.literal('arrayElements'),
	...ArrayElementsExtensionSchema.shape,
});

/**
 * Inferred types from schemas
 */
export type ArrayElementsExtension = z.infer<typeof ArrayElementsExtensionSchema>;
export type ArrayElementsConfig = z.infer<typeof ArrayElementConfigSchema>;

/**
 * Extend the global FormEngine interface
 */
declare global {
	namespace FormEngine {
		interface FormFieldElements {
			arrayElements: ArrayElementsConfig;
		}
	}
}
