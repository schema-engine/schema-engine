import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const MaskedInputFieldExtensionSchema = z.object({
	mask: z.string().describe('iMask pattern. Use 0 for digits and a for letters, e.g. "aa00 0000 0000 0000 0000 00"'),
	unmask: z.union([z.boolean(), z.literal('typed')]).optional(),
	lazy: z.boolean().optional(),
	overwrite: z.boolean().optional(),
	placeholderChar: z.string().optional(),
	definitions: z.record(z.string(), z.string()).optional(),
	autoComplete: z.string().optional(),
	autoFocus: z.boolean().optional(),
	inputMode: z.enum(['none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url']).optional(),
});

export const MaskedInputFieldSchema = BaseFieldSchema.extend({
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
	mask: 'aa00 0000 0000 0000 0000 00',
	placeholder: 'DE89 3704 0044 0532 0130 00',
	inputMode: 'text',
};
