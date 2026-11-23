import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms';

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

export type MaskedInputFieldProps = MaskedInputFieldConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};

export const maskedInputFieldExample: MaskedInputFieldConfig = {
	$type: 'masked-input',
	name: 'iban',
	label: 'Bank account (IBAN)',
	description: 'International bank account number',
	mask: 'aa00 0000 0000 000000',
	placeholder: 'ES12 4311 2144 214423',
	inputMode: 'text',
};

/** The value a masked field writes: the masked or unmasked text, or the typed value of the mask with `unmask: 'typed'`. */
export const maskedInputFieldValue = (
	config: Pick<MaskedInputFieldConfig, 'unmask'>,
): z.ZodMiniType<string | number | Date> =>
	config.unmask === 'typed' ? z.union([z.string(), z.number(), z.date()]) : z.string();
