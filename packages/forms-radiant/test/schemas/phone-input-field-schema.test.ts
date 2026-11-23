import { describe, expect, test } from 'vitest';
import {
	PhoneInputFieldSchema,
	phoneInputFieldExample,
	type PhoneInputFieldConfig,
} from '../../src/elements/inputs/form-phone-input.types';

describe('Phone input field schema', () => {
	test('validates a complete configuration', () => {
		const config: PhoneInputFieldConfig = {
			$type: 'phone-input',
			id: 'phone',
			name: 'phone',
			label: 'Phone',
			defaultCountry: 'US',
			international: true,
			placeholder: 'Enter phone number',
		};

		const result = PhoneInputFieldSchema.safeParse(config);
		expect(result.success).toBe(true);
	});

	test('validates the documented example', () => {
		expect(PhoneInputFieldSchema.safeParse(phoneInputFieldExample).success).toBe(true);
	});

	test('rejects wrong element type', () => {
		const result = PhoneInputFieldSchema.safeParse({
			$type: 'input',
			id: 'phone',
			name: 'phone',
		});
		expect(result.success).toBe(false);
	});

	test('allows optional country and international flags', () => {
		const result = PhoneInputFieldSchema.safeParse({
			$type: 'phone-input',
			id: 'minimal-phone',
			name: 'minimalPhone',
		});
		expect(result.success).toBe(true);
	});

	test('keeps authored rules unchanged', () => {
		const result = PhoneInputFieldSchema.parse({
			$type: 'phone-input',
			id: 'phone',
			name: 'phone',
			rules: [{ $type: 'required', message: 'Phone number is required' }],
		});

		expect(result.rules).toEqual([{ $type: 'required', message: 'Phone number is required' }]);
	});

	test('preserves an explicitly configured phone-validation message', () => {
		const result = PhoneInputFieldSchema.parse({
			$type: 'phone-input',
			id: 'phone',
			name: 'phone',
			rules: [{ $type: 'phone', message: 'Use a complete number' }],
		});

		expect(result.rules).toEqual([{ $type: 'phone', message: 'Use a complete number' }]);
	});
});
