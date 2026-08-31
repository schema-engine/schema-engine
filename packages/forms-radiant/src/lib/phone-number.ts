import type { CountryCode } from 'libphonenumber-js';

export type LibPhoneNumber = typeof import('libphonenumber-js');

export type PhoneCountryOption = {
	code: CountryCode;
	name: string;
	callingCode: string;
	flag: string;
};

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

let phoneLoader: Promise<LibPhoneNumber> | undefined;
let flagLoader: Promise<Record<string, string>> | undefined;
let cachedFlags: Record<string, string> | undefined;
let cachedCountries: PhoneCountryOption[] | undefined;

export function loadLibphonenumber() {
	phoneLoader ??= import('libphonenumber-js');
	return phoneLoader;
}

export function loadCountryFlags() {
	flagLoader ??= import('country-flag-icons/string/3x2').then((module) => {
		cachedFlags = Object.fromEntries(
			Object.entries(module).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
		);
		cachedCountries = undefined;
		return cachedFlags;
	});
	return flagLoader;
}

export function countryFlagSvg(code: string) {
	return cachedFlags?.[code.toUpperCase()] ?? '';
}

export function countryFlagEmoji(code: string) {
	const normalized = code.toUpperCase();
	if (!/^[A-Z]{2}$/.test(normalized)) {
		return '';
	}

	return String.fromCodePoint(127397 + normalized.charCodeAt(0), 127397 + normalized.charCodeAt(1));
}

export function resolvePhoneCountry(
	lib: LibPhoneNumber,
	code: string | undefined,
	fallback: CountryCode = 'US',
): CountryCode {
	if (code && lib.isSupportedCountry(code)) {
		return code;
	}
	return fallback;
}

export function listPhoneCountries(lib: LibPhoneNumber): PhoneCountryOption[] {
	if (cachedCountries) {
		return cachedCountries;
	}

	cachedCountries = lib
		.getCountries()
		.map((code) => ({
			code,
			name: regionNames.of(code) ?? code,
			callingCode: lib.getCountryCallingCode(code),
			flag: countryFlagSvg(code) || countryFlagEmoji(code),
		}))
		.toSorted((left, right) => left.name.localeCompare(right.name));

	return cachedCountries;
}

export function formatPhoneInputValue(
	lib: LibPhoneNumber,
	input: string,
	country: CountryCode,
	international: boolean,
) {
	const incomplete = lib.parseIncompletePhoneNumber(input);
	if (!incomplete) {
		return '';
	}

	if (international) {
		const withPlus = incomplete.startsWith('+')
			? incomplete
			: `+${lib.getCountryCallingCode(country)}${incomplete}`;
		return lib.formatIncompletePhoneNumber(withPlus);
	}

	if (incomplete.startsWith('+')) {
		const prefix = `+${lib.getCountryCallingCode(country)}`;
		const hasCallingCode = incomplete === prefix || incomplete.startsWith(prefix);
		const national = hasCallingCode ? incomplete.slice(prefix.length) : '';

		if (hasCallingCode && national) {
			return lib.formatIncompletePhoneNumber(national, country);
		}

		return incomplete;
	}

	return lib.formatIncompletePhoneNumber(incomplete, country);
}

export function phoneInputToE164(lib: LibPhoneNumber, input: string, country: CountryCode) {
	const parsed = lib.parsePhoneNumberFromString(input, country);
	if (parsed?.number) {
		return parsed.number;
	}

	const incomplete = lib.parseIncompletePhoneNumber(input);
	if (!incomplete) {
		return '';
	}
	if (incomplete.startsWith('+')) {
		return incomplete;
	}
	return `+${lib.getCountryCallingCode(country)}${incomplete}`;
}

export function hydratePhoneValue(
	lib: LibPhoneNumber,
	value: string | undefined,
	fallbackCountry: CountryCode,
	international = false,
) {
	if (!value) {
		return { country: fallbackCountry, display: '', e164: '' };
	}

	const parsed = lib.parsePhoneNumberFromString(value, fallbackCountry);
	const country = parsed?.country ?? detectCountryFromInput(lib, value, fallbackCountry);

	return {
		country,
		display: formatPhoneInputValue(lib, value, country, international),
		e164: parsed?.number ?? lib.parseIncompletePhoneNumber(value),
	};
}

type PhoneMetadataBag = {
	metadata?: {
		country_calling_codes?: Record<string, CountryCode[]>;
	};
};

function countryForCallingCode(lib: LibPhoneNumber, callingCode: string): CountryCode | undefined {
	const metadata = new lib.Metadata() as PhoneMetadataBag;
	const country = metadata.metadata?.country_calling_codes?.[callingCode]?.[0];
	if (country && lib.isSupportedCountry(country)) {
		return country;
	}
	return undefined;
}

export function detectCountryFromInput(lib: LibPhoneNumber, input: string, fallback: CountryCode): CountryCode {
	const incomplete = lib.parseIncompletePhoneNumber(input);
	if (!incomplete?.startsWith('+')) {
		return fallback;
	}

	const asYouType = new lib.AsYouType();
	asYouType.input(incomplete);

	const fromFormatter = asYouType.getCountry();
	if (fromFormatter && lib.isSupportedCountry(fromFormatter)) {
		return fromFormatter;
	}

	const parsed = lib.parsePhoneNumberFromString(incomplete);
	if (parsed?.country && lib.isSupportedCountry(parsed.country)) {
		return parsed.country;
	}

	const callingCode = asYouType.getCallingCode() ?? parsed?.countryCallingCode;
	if (!callingCode) {
		return fallback;
	}

	return countryForCallingCode(lib, callingCode) ?? fallback;
}
