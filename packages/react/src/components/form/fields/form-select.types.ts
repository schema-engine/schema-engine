import { z } from 'zod';
import { BaseFieldSchema } from '@json-form-engine/core/schemas/base-field';

/**
 * Option definition for select fields
 */
export const SelectOptionSchema = z.object({
	value: z.union([z.string(), z.number()]),
	label: z.string(),
	disabled: z.boolean().optional(),
});

/**
 * Select field extension schema - defines select-specific properties
 * Validation is handled through the rules property on the base field
 */
export const SelectFieldExtensionSchema = z.object({
	options: z.array(SelectOptionSchema).describe('Available options for the select field'),
	multiple: z.boolean().optional(),
	autoComplete: z.string().optional(),
	autoFocus: z.boolean().optional(),
	size: z.number().optional(),
});

/**
 * Complete select field configuration schema
 */
export const SelectFieldConfigSchema = BaseFieldSchema.extend({
	componentId: z.literal('select'),
	...SelectFieldExtensionSchema.shape,
});

/**
 * Inferred types from schemas
 */
export type SelectOption = z.infer<typeof SelectOptionSchema>;
export type SelectFieldExtension = z.infer<typeof SelectFieldExtensionSchema>;
export type SelectFieldConfig = z.infer<typeof SelectFieldConfigSchema>;

/**
 * Select field component props interface
 * Adds optional handlers for standalone usage
 */
export type SelectFieldProps = SelectFieldConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
