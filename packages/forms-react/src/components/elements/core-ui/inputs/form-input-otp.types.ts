import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const InputOTPFieldExtensionSchema = z.object({
	length: z.number().positive().default(6).optional(),
	autoFocus: z.boolean().optional(),
	pattern: z.enum(['numeric', 'alphanumeric']).default('numeric').optional(),
	disabled: z.boolean().optional(),
});

export const InputOTPFieldConfigSchema = BaseFieldSchema.extend({
	$type: z.literal('input-otp'),
	...InputOTPFieldExtensionSchema.shape,
});

export type InputOTPFieldExtension = z.infer<typeof InputOTPFieldExtensionSchema>;
export type InputOTPFieldConfig = z.infer<typeof InputOTPFieldConfigSchema>;

export type InputOTPFieldProps = InputOTPFieldConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
