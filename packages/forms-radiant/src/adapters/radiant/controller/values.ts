import { getValueAtPath, setValueAtPath } from '@schema-engine/forms/lib/path-values';

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

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
	if (isPlainRecord(value)) {
		return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneValue(child)]));
	}
	return value;
}

export function flattenValues(values: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	function visit(name: string, value: unknown): void {
		result[name] = value;
		if (Array.isArray(value) || isPlainRecord(value)) {
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

function valuesEqual(previous: unknown, next: unknown): boolean {
	if (Object.is(previous, next)) return true;
	if (previous instanceof Date && next instanceof Date) return previous.getTime() === next.getTime();
	if (Array.isArray(previous) && Array.isArray(next)) {
		return previous.length === next.length && previous.every((item, index) => valuesEqual(item, next[index]));
	}
	if (isPlainRecord(previous) && isPlainRecord(next)) {
		return [...new Set([...Object.keys(previous), ...Object.keys(next)])].every((key) =>
			valuesEqual(previous[key], next[key]),
		);
	}
	return false;
}

/**
 * Reports whether a store notification changed the values.
 *
 * @remarks
 * The first snapshot is the baseline and reports no change. Touching, blurring, recording an error and
 * updating submit state notify the store without changing a value, so a consumer of value changes
 * compares each snapshot with the previous one instead of acting on every notification.
 */
export function createChangeDetector(): (values: Record<string, unknown>) => boolean {
	let previous: Record<string, unknown> | undefined;
	return (values) => {
		const changed = previous !== undefined && !valuesEqual(previous, values);
		previous = values;
		return changed;
	};
}
