export function serializeChoiceValue(value: unknown): string | undefined {
	if (value == null || value === '') {
		return undefined;
	}

	if (Array.isArray(value)) {
		return value.map(String).filter(Boolean).join(',') || undefined;
	}

	return String(value);
}

export function parseChoiceValue(value: string, multiple: boolean): string | string[] {
	if (!multiple) {
		return value;
	}

	return value === '' ? [] : value.split(',').filter(Boolean);
}
