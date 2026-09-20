import { getValueAtPath, setValueAtPath } from '@schema-engine/forms/lib/path-values';

/** Converts Radiant UI's flat field names into the engine's nested value tree. */
export function expandValues(values: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [name, value] of Object.entries(values).toSorted(
		([a], [b]) => a.split('.').length - b.split('.').length,
	)) {
		if (isRemovedArrayField(result, name)) continue;
		setValueAtPath(result, name, cloneValue(value));
	}
	return result;
}

function cloneValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(cloneValue);
	if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
		return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneValue(child)]));
	}
	return value;
}

export function flattenValues(values: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	function visit(name: string, value: unknown): void {
		result[name] = value;
		if (
			value &&
			typeof value === 'object' &&
			(Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype)
		) {
			for (const [key, child] of Object.entries(value)) visit(`${name}.${key}`, child);
		}
	}
	for (const [name, value] of Object.entries(values)) visit(name, value);
	return result;
}

export function readValue(values: Record<string, unknown>, name: string): unknown {
	const hasNestedKeys = Object.keys(values).some((key) => key.startsWith(`${name}.`));
	if (name in values && !hasNestedKeys) {
		return cloneValue(values[name]);
	}
	return getValueAtPath(expandValues(values), name);
}

function isRemovedArrayField(values: Record<string, unknown>, name: string): boolean {
	const segments = name.split('.');
	for (let index = 1; index < segments.length; index++) {
		const parent = getValueAtPath(values, segments.slice(0, index).join('.'));
		if (Array.isArray(parent) && /^\d+$/.test(segments[index]) && Number(segments[index]) >= parent.length)
			return true;
	}
	return false;
}
