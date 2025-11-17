import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

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
	$type: z.literal('switch'),
	...SwitchFieldExtensionSchema.shape,
});

/**
 * Inferred types from schemas
 */
export type SwitchFieldExtension = z.infer<typeof SwitchFieldExtensionSchema>;
export type SwitchFieldConfig = z.infer<typeof SwitchFieldConfigSchema>;

/**
 * Switch field component props interface
 * Adds optional handlers for standalone usage
 */
export type SwitchFieldProps = SwitchFieldConfig & {
	onChange?: (checked: boolean) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
