import { describe, expect, test } from 'vitest';
import {
	countryFlagSvg,
	detectCountryFromInput,
	formatPhoneInputValue,
	hydratePhoneValue,
	listPhoneCountries,
	loadCountryFlags,
	loadLibphonenumber,
	phoneInputToE164,
	resolvePhoneCountry,
} from '@/lib/phone-number';

describe('phone number helpers', () => {
	test('loads libphonenumber-js on demand', async () => {
		const lib = await loadLibphonenumber();
		expect(typeof lib.parseIncompletePhoneNumber).toBe('function');
		expect(await loadLibphonenumber()).toBe(lib);
	});

	test('formats a US national number as you type', async () => {
		const lib = await loadLibphonenumber();
		expect(formatPhoneInputValue(lib, '2025550123', 'US', false)).toBe('(202) 555-0123');
	});

	test('formats an international number with a plus prefix', async () => {
		const lib = await loadLibphonenumber();
		expect(formatPhoneInputValue(lib, '+12025550123', 'US', true)).toBe('+1 202 555 0123');
	});

	test('keeps a typed plus prefix visible until national digits are entered', async () => {
		const lib = await loadLibphonenumber();
		expect(formatPhoneInputValue(lib, '+', 'US', false)).toBe('+');
		expect(formatPhoneInputValue(lib, '+4', 'US', false)).toBe('+4');
		expect(formatPhoneInputValue(lib, '+44', 'GB', false)).toBe('+44');
	});

	test('hides the calling-code prefix in the national display', async () => {
		const lib = await loadLibphonenumber();
		expect(formatPhoneInputValue(lib, '+12025550123', 'US', false)).toBe('(202) 555-0123');
		expect(formatPhoneInputValue(lib, '+442079460958', 'GB', false)).not.toContain('+');
		expect(formatPhoneInputValue(lib, '+442079460958', 'GB', false)).toContain('20');
	});

	test('stores E.164 when converting a prefixed number to national display', async () => {
		const lib = await loadLibphonenumber();
		expect(phoneInputToE164(lib, '+442079460958', 'GB')).toBe('+442079460958');
		expect(phoneInputToE164(lib, '+44', 'GB')).toBe('+44');
	});

	test('hydrates an E.164 value into country and display', async () => {
		const lib = await loadLibphonenumber();
		const hydrated = hydratePhoneValue(lib, '+442079460958', 'US');
		expect(hydrated.country).toBe('GB');
		expect(hydrated.e164).toBe('+442079460958');
		expect(hydrated.display).not.toContain('+');
		expect(hydrated.display).toContain('20');
	});

	test('lists countries with SVG flags and calling codes', async () => {
		const lib = await loadLibphonenumber();
		await loadCountryFlags();
		const us = listPhoneCountries(lib).find((country) => country.code === 'US');
		expect(us?.callingCode).toBe('1');
		expect(us?.flag).toContain('<svg');
		expect(us?.flag).toBe(countryFlagSvg('US'));
		expect(us?.name).toMatch(/united states/i);
	});

	test('falls back to US for unsupported country codes', async () => {
		const lib = await loadLibphonenumber();
		expect(resolvePhoneCountry(lib, 'ZZ')).toBe('US');
		expect(resolvePhoneCountry(lib, 'GB')).toBe('GB');
	});

	test('detects country from an international calling-code prefix', async () => {
		const lib = await loadLibphonenumber();
		expect(detectCountryFromInput(lib, '+44', 'US')).toBe('GB');
		expect(detectCountryFromInput(lib, '+39', 'US')).toBe('IT');
		expect(detectCountryFromInput(lib, '+33', 'US')).toBe('FR');
		expect(detectCountryFromInput(lib, '+1', 'GB')).toBe('US');
	});

	test('keeps the selected country for national numbers without a prefix', async () => {
		const lib = await loadLibphonenumber();
		expect(detectCountryFromInput(lib, '2025550123', 'US')).toBe('US');
		expect(detectCountryFromInput(lib, '7911123456', 'GB')).toBe('GB');
	});
});
