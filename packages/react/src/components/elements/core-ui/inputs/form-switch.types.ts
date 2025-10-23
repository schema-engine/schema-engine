import { z } from 'zod';
import { BaseFieldSchema } from '@json-form-engine/core/schemas/base-field';

export const SwitchFieldExtensionSchema = z.object({
	autoFocus: z.boolean().optional(),
	size: z.enum(['sm', 'md', 'lg']).optional(),
});

export const SwitchFieldConfigSchema = BaseFieldSchema.extend({
	$type: z.literal('switch'),
	...SwitchFieldExtensionSchema.shape,
});

export type SwitchFieldExtension = z.infer<typeof SwitchFieldExtensionSchema>;
export type SwitchFieldConfig = z.infer<typeof SwitchFieldConfigSchema>;

export type SwitchFieldProps = SwitchFieldConfig & {
	onChange?: (checked: boolean) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
