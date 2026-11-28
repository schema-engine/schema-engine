import * as z from 'zod/mini';
import { BaseFieldSchema } from '../schemas/base-field.js';
import { defineInputContract } from './define-contract.js';

export const MaskedInputFieldExtensionSchema = z.object({
	mask: z
		.string()
		.check(z.describe('iMask pattern. Use 0 for digits and a for letters, e.g. "aa00 0000 0000 000000"')),
	unmask: z.optional(z.union([z.boolean(), z.literal('typed')])),
	lazy: z.optional(z.boolean()),
	overwrite: z.optional(z.boolean()),
	placeholderChar: z.optional(z.string()),
	definitions: z.optional(z.record(z.string(), z.string())),
	autoComplete: z.optional(z.string()),
	autoFocus: z.optional(z.boolean()),
	inputMode: z.optional(z.enum(['none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url'])),
});

export const MaskedInputFieldSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('masked-input'),
	...MaskedInputFieldExtensionSchema.shape,
});

export type MaskedInputFieldConfig = z.infer<typeof MaskedInputFieldSchema>;

export const maskedInputFieldExample: MaskedInputFieldConfig = {
	$type: 'masked-input',
	name: 'iban',
	label: 'Bank account (IBAN)',
	description: 'International bank account number',
	mask: 'aa00 0000 0000 000000',
	placeholder: 'ES12 4311 2144 214423',
	inputMode: 'text',
};

/**
 * The value a masked field writes: the masked or unmasked text, or the typed value of the mask with `unmask: 'typed'`.
 *
 * @remarks
 * A renderer may write the typed value as text, which this accepts too.
 */
export const maskedInputFieldValue = (
	config: Pick<MaskedInputFieldConfig, 'unmask'>,
): z.ZodMiniType<string | number | Date> =>
	config.unmask === 'typed' ? z.union([z.string(), z.number(), z.date()]) : z.string();

/** The contract of the `masked-input` element: what every renderer of it agrees on. */
export const MaskedInputElementContract = defineInputContract({
	$type: 'masked-input',
	appearanceAxes: ['size'],
	schema: MaskedInputFieldSchema,
	value: maskedInputFieldValue,
	metadata: {
		name: 'Masked Input',
		description: 'Text input with an iMask pattern for formatted values like IBAN, cards, and dates',
		category: 'input',
	},
});
