import {
	AsYouType,
	Metadata,
	formatIncompletePhoneNumber,
	getCountryCallingCode,
	isSupportedCountry,
	parseIncompletePhoneNumber,
	parsePhoneNumberFromString,
	type CountryCode,
} from 'libphonenumber-js/min';

type PhoneMetadataBag = {
	metadata?: {
		country_calling_codes?: Record<string, CountryCode[]>;
	};
};

function countryForCallingCode(callingCode: string): CountryCode | undefined {
	const metadata = new Metadata() as PhoneMetadataBag;
	const country = metadata.metadata?.country_calling_codes?.[callingCode]?.[0];
	if (country && isSupportedCountry(country)) {
		return country;
	}
	return undefined;
}

export function detectCountryFromInput(input: string, fallback: CountryCode): CountryCode {
	const incomplete = parseIncompletePhoneNumber(input);
	if (!incomplete?.startsWith('+')) {
		return fallback;
	}

	const asYouType = new AsYouType();
	asYouType.input(incomplete);

	const fromFormatter = asYouType.getCountry();
	if (fromFormatter && isSupportedCountry(fromFormatter)) {
		return fromFormatter;
	}

	const parsed = parsePhoneNumberFromString(incomplete);
	if (parsed?.country && isSupportedCountry(parsed.country)) {
		return parsed.country;
	}

	const callingCode = asYouType.getCallingCode() ?? parsed?.countryCallingCode;
	if (!callingCode) {
		return fallback;
	}

	return countryForCallingCode(callingCode) ?? fallback;
}

export function formatPhoneInputValue(input: string, country: CountryCode, international: boolean) {
	const incomplete = parseIncompletePhoneNumber(input);
	if (!incomplete) {
		return '';
	}

	if (international) {
		const withPlus = incomplete.startsWith('+') ? incomplete : `+${getCountryCallingCode(country)}${incomplete}`;
		return formatIncompletePhoneNumber(withPlus);
	}

	if (incomplete.startsWith('+')) {
		const prefix = `+${getCountryCallingCode(country)}`;
		const hasCallingCode = incomplete === prefix || incomplete.startsWith(prefix);
		const national = hasCallingCode ? incomplete.slice(prefix.length) : '';

		if (hasCallingCode && national) {
			return formatIncompletePhoneNumber(national, country);
		}

		return incomplete;
	}

	return formatIncompletePhoneNumber(incomplete, country);
}

export function phoneInputToE164(input: string, country: CountryCode) {
	const parsed = parsePhoneNumberFromString(input, country);
	if (parsed?.number) {
		return parsed.number;
	}

	const incomplete = parseIncompletePhoneNumber(input);
	if (!incomplete) {
		return '';
	}
	if (incomplete.startsWith('+')) {
		return incomplete;
	}
	return `+${getCountryCallingCode(country)}${incomplete}`;
}
