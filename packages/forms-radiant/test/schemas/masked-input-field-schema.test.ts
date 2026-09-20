import { describe, expect, test } from 'vitest';
import {
	MaskedInputFieldSchema,
	maskedInputFieldExample,
	type MaskedInputFieldConfig,
} from '../../src/elements/inputs/form-masked-input.types';

describe('Masked input field schema', () => {
	test('validates a complete configuration', () => {
		const config: MaskedInputFieldConfig = {
			$type: 'masked-input',
			id: 'iban',
			name: 'iban',
			label: 'IBAN',
			mask: 'aa00 0000 0000 0000 0000 00',
			unmask: true,
			lazy: false,
			overwrite: true,
			placeholderChar: '_',
			definitions: { x: '[0-9]' },
			inputMode: 'text',
			autoComplete: 'off',
		};

		const result = MaskedInputFieldSchema.safeParse(config);
		expect(result.success).toBe(true);
	});

	test('validates the documented example', () => {
		expect(MaskedInputFieldSchema.safeParse(maskedInputFieldExample).success).toBe(true);
	});

	test('requires a mask pattern', () => {
		const result = MaskedInputFieldSchema.safeParse({
			$type: 'masked-input',
			id: 'no-mask',
			name: 'noMask',
		});
		expect(result.success).toBe(false);
	});

	test('rejects invalid inputMode values', () => {
		const result = MaskedInputFieldSchema.safeParse({
			$type: 'masked-input',
			id: 'bad-mode',
			name: 'badMode',
			mask: '0000',
			inputMode: 'invalid',
		});
		expect(result.success).toBe(false);
	});

	test('accepts typed unmask mode', () => {
		const result = MaskedInputFieldSchema.safeParse({
			$type: 'masked-input',
			id: 'typed',
			name: 'typed',
			mask: '0000',
			unmask: 'typed',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.unmask).toBe('typed');
		}
	});
});
