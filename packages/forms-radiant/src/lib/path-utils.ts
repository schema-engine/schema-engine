export function getValueAtPath<TValue = unknown>(input: unknown, path: string): TValue | undefined {
	if (!path) {
		return input as TValue;
	}

	return path.split('.').reduce<unknown>((current, segment) => {
		if (current === null || current === undefined) {
			return undefined;
		}

		return (current as Record<string, unknown>)[segment];
	}, input) as TValue | undefined;
}

export function setValueAtPath(target: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
	if (!path) {
		return target;
	}

	const segments = path.split('.');
	let current: Record<string, unknown> = target;

	for (let index = 0; index < segments.length; index += 1) {
		const segment = segments[index];
		const isLeaf = index === segments.length - 1;

		if (isLeaf) {
			current[segment] = value;
			break;
		}

		const nextSegment = segments[index + 1];
		const nextIsIndex = /^\d+$/.test(nextSegment);
		const existing = current[segment];

		if (Array.isArray(existing)) {
			current = existing as unknown as Record<string, unknown>;
			continue;
		}

		if (existing && typeof existing === 'object') {
			current = existing as Record<string, unknown>;
			continue;
		}

		const container: Record<string, unknown> | unknown[] = nextIsIndex ? [] : {};
		current[segment] = container;
		current = container as Record<string, unknown>;
	}

	return target;
}

export function mergePathValues(
	fields: Array<{ name: string; defaultValue?: unknown }>,
	userDefaults: Record<string, unknown> = {},
): Record<string, unknown> {
	const fieldDefaults = fields.reduce<Record<string, unknown>>((accumulator, field) => {
		if (field.defaultValue !== undefined) {
			setValueAtPath(accumulator, field.name, field.defaultValue);
		}
		return accumulator;
	}, {});

	return deepMerge(fieldDefaults, userDefaults) as Record<string, unknown>;
}

function deepMerge(base: unknown, override: unknown): unknown {
	if (Array.isArray(base) && Array.isArray(override)) {
		return override.map((value, index) => deepMerge(base[index], value));
	}

	if (isPlainObject(base) && isPlainObject(override)) {
		const result: Record<string, unknown> = { ...base };
		for (const [key, value] of Object.entries(override)) {
			result[key] = key in result ? deepMerge(result[key], value) : value;
		}
		return result;
	}

	return override === undefined ? base : override;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
