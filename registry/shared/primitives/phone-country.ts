import {
	AsYouType,
	Metadata,
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
