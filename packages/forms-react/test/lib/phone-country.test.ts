import { describe, expect, test } from 'vitest';
import { detectCountryFromInput } from '@/components/ui/schema-engine/components/phone-country';

describe('detectCountryFromInput', () => {
	test('maps international prefixes to a country', () => {
		expect(detectCountryFromInput('+44', 'US')).toBe('GB');
		expect(detectCountryFromInput('+39', 'US')).toBe('IT');
		expect(detectCountryFromInput('+33', 'US')).toBe('FR');
		expect(detectCountryFromInput('+1', 'GB')).toBe('US');
	});

	test('keeps the selected country for national numbers', () => {
		expect(detectCountryFromInput('2025550123', 'US')).toBe('US');
		expect(detectCountryFromInput('7911123456', 'GB')).toBe('GB');
	});
});
