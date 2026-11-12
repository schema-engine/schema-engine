export function serializeChoiceValue(value: unknown): string | undefined {
	if (value == null || value === '') {
		return undefined;
	}

	if (Array.isArray(value)) {
		return (
			value
				.map((item) =>
					typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
						? String(item)
						: '',
				)
				.filter(Boolean)
				.join(',') || undefined
		);
	}

	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	return undefined;
}
