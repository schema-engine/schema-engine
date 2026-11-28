import * as z from 'zod/mini';
import { BaseFieldSchema } from '@/schemas/base-field.js';
import type { BaseValidationRule } from '@/schemas/validation/types.js';
import { defineInputContract } from './define-contract.js';

export const InputOTPFieldExtensionSchema = z.object({
	length: z.optional(z._default(z.number().check(z.positive()), 6)),
	autoFocus: z.optional(z.boolean()),
	pattern: z.optional(z._default(z.enum(['numeric', 'alphanumeric']), 'numeric')),
	disabled: z.optional(z.boolean()),
	incompleteMessage: z.optional(z.string()),
});

/**
 * Adds an exact-length rule when the author wrote no length or pattern rule.
 *
 * @remarks
 * The code is the filled slots joined, so one with a gap is a shorter string and would
 * otherwise pass as complete. A `pattern` rather than `minLength` because it also holds the
 * code to exactly `length` characters. Format rules skip an empty value, so an empty optional
 * code stays valid and `required` still rejects it. `incompleteMessage` replaces the default text.
 */
function withCompleteCodeRule<T extends { length?: number; incompleteMessage?: string; rules?: BaseValidationRule[] }>(
	config: T,
): T {
	const length = config.length ?? 6;
	if (config.rules?.some((rule) => ['minLength', 'maxLength', 'pattern'].includes(rule.$type))) return config;
	const complete = {
		$type: 'pattern',
		value: `^.{${length}}$`,
		message: config.incompleteMessage ?? `Enter all ${length} characters`,
	} as const;
	return { ...config, rules: [...(config.rules ?? []), complete] };
}

export const InputOTPFieldConfigSchema = z.pipe(
	z.extend(BaseFieldSchema, {
		$type: z.literal('input-otp'),
		...InputOTPFieldExtensionSchema.shape,
	}),
	z.transform(withCompleteCodeRule),
);

export type InputOTPFieldExtension = z.infer<typeof InputOTPFieldExtensionSchema>;
export type InputOTPFieldConfig = z.infer<typeof InputOTPFieldConfigSchema>;

/** The value an OTP field writes: the code typed so far. */
export const inputOTPFieldValue = () => z.string();

/** The contract of the `input-otp` element: what every renderer of it agrees on. */
export const InputOTPElementContract = defineInputContract({
	$type: 'input-otp',
	appearanceAxes: ['size'],
	schema: InputOTPFieldConfigSchema,
	value: inputOTPFieldValue,
	metadata: {
		name: 'OTP Input',
		description: 'One-time password input field with multiple slots',
		category: 'input',
	},
});
