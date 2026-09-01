import { describe, expect, test } from 'vitest';
import {
	detectCountryFromInput,
	formatPhoneInputValue,
	phoneInputToE164,
} from '@/components/ui/schema-engine/components/phone-country';

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

describe('formatPhoneInputValue', () => {
	test('keeps a typed plus prefix visible until national digits are entered', () => {
		expect(formatPhoneInputValue('+', 'US', false)).toBe('+');
		expect(formatPhoneInputValue('+4', 'US', false)).toBe('+4');
		expect(formatPhoneInputValue('+44', 'GB', false)).toBe('+44');
	});

	test('hides the calling-code prefix in the national display', () => {
		expect(formatPhoneInputValue('+12025550123', 'US', false)).toBe('(202) 555-0123');
		expect(formatPhoneInputValue('+442079460958', 'GB', false)).not.toContain('+');
		expect(formatPhoneInputValue('+442079460958', 'GB', false)).toContain('20');
	});
});

describe('phoneInputToE164', () => {
	test('stores E.164 when converting a prefixed number to national display', () => {
		expect(phoneInputToE164('+442079460958', 'GB')).toBe('+442079460958');
		expect(phoneInputToE164('2025550123', 'US')).toBe('+12025550123');
	});
});
