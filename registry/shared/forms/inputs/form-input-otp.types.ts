import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const InputOTPFieldExtensionSchema = z.object({
	length: z.optional(z._default(z.number().check(z.positive()), 6)),
	autoFocus: z.optional(z.boolean()),
	pattern: z.optional(z._default(z.enum(['numeric', 'alphanumeric']), 'numeric')),
	disabled: z.optional(z.boolean()),
});

export const InputOTPFieldConfigSchema = z.extend(BaseFieldSchema, {
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
