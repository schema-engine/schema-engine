import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms';

export const SwitchFieldExtensionSchema = z.object({
	autoFocus: z.optional(z.boolean()),
	size: z.optional(z.enum(['sm', 'md', 'lg'])),
});

export const SwitchFieldConfigSchema = z.extend(BaseFieldSchema, {
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

/** The value a switch writes: whether it is on. */
export const switchFieldValue = () => z.boolean();
