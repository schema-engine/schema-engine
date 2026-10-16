import { isPlainObject } from './is-plain-object.js';
/**
 * Nested value-tree helpers shared by React and Radiant adapters.
 * Field *names* are composed in {@link ./field-scope.ts}; this module reads and writes values.
 */

const RESERVED_PATH_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function assertWritablePathKey(key: string): void {
	if (RESERVED_PATH_KEYS.has(key)) {
		throw new Error(`Rejected path segment '${key}'`);
	}
}

function createValueObject(): Record<string, unknown> {
	return Object.create(null) as Record<string, unknown>;
}

export function getValueAtPath<TValue = unknown>(input: unknown, path: string): TValue | undefined {
	if (!path) {
		return input as TValue;
	}

	return path.split('.').reduce<unknown>((current, segment) => {
		if (current === null || current === undefined || RESERVED_PATH_KEYS.has(segment)) {
			return undefined;
		}

		return Object.hasOwn(current as object, segment) ? (current as Record<string, unknown>)[segment] : undefined;
	}, input) as TValue | undefined;
}

/**
 * Materialize a dotted path into an object or array-backed structure.
 * Intermediate containers are created on demand using the next path segment to
 * decide whether the shape should be an object or an array.
 */
export function setValueAtPath(target: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
	if (!path) {
		return target;
	}

	const segments = path.split('.');
	let current: Record<string, unknown> = target;

	for (let index = 0; index < segments.length; index += 1) {
		const segment = segments[index];
		assertWritablePathKey(segment);
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

		const container: Record<string, unknown> | unknown[] = nextIsIndex ? [] : createValueObject();
		current[segment] = container;
		current = container as Record<string, unknown>;
	}

	return target;
}

/**
 * Build adapter default values from field-level defaults and merge them with
 * consumer-provided defaults using nested path semantics.
 *
 * @remarks
 * Config snapshots are frozen. Defaults are cloned into a mutable value tree
 * before nested writes so parent objects are never mutated in place.
 */
export function mergePathValues(
	fields: readonly { name: string; defaultValue?: unknown }[],
	userDefaults: Record<string, unknown> = {},
): Record<string, unknown> {
	const fieldDefaults = fields.reduce<Record<string, unknown>>((accumulator, field) => {
		if (field.defaultValue !== undefined) {
			setValueAtPath(accumulator, field.name, clonePlainValue(field.defaultValue));
		}
		return accumulator;
	}, {});

	return deepMerge(fieldDefaults, clonePlainValue(userDefaults)) as Record<string, unknown>;
}

/**
 * Resolve a field path through live array rows while keeping an array at the field itself intact.
 *
 * @remarks
 * An empty parent array produces no child paths; a field whose value is an empty array still returns its own path.
 */
export function expandFieldTemplatePaths(values: Record<string, unknown>, templatePath: string): string[] {
	return expandTemplatePaths(values, templatePath, false);
}

/**
 * Expand a container's parent path through each live array row, including an array at the path's end.
 */
export function expandContainerParentPaths(values: Record<string, unknown>, templatePath: string): string[] {
	return expandTemplatePaths(values, templatePath, true);
}

function expandTemplatePaths(
	values: Record<string, unknown>,
	templatePath: string,
	expandTerminalArrays: boolean,
): string[] {
	const parts = templatePath.split('.');
	const paths: string[] = [];
	let expandedArray = false;

	function traverse(obj: unknown, currentParts: string[], remainingParts: string[]): void {
		if (remainingParts.length === 0) {
			paths.push(currentParts.join('.'));
			return;
		}

		const [nextPart, ...rest] = remainingParts;
		if (RESERVED_PATH_KEYS.has(nextPart)) {
			return;
		}

		if (obj === null || obj === undefined || typeof obj !== 'object' || !Object.hasOwn(obj, nextPart)) {
			paths.push([...currentParts, ...remainingParts].join('.'));
			return;
		}

		const nextValue = (obj as Record<string, unknown>)[nextPart];

		if (Array.isArray(nextValue)) {
			if (rest.length === 0 && !expandTerminalArrays) {
				paths.push([...currentParts, nextPart].join('.'));
				return;
			}

			expandedArray = true;
			for (let index = 0; index < nextValue.length; index += 1) {
				traverse(nextValue[index], [...currentParts, nextPart, String(index)], rest);
			}
			return;
		}

		if (nextValue !== undefined) {
			traverse(nextValue, [...currentParts, nextPart], rest);
		} else {
			paths.push([...currentParts, nextPart, ...rest].join('.'));
		}
	}

	traverse(values, [], parts);
	return paths.length > 0 ? paths : expandedArray ? [] : [templatePath];
}

function clonePlainValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(clonePlainValue);
	}

	if (value && typeof value === 'object') {
		const proto = Object.getPrototypeOf(value);
		if (proto === Object.prototype || proto === null) {
			const copy = createValueObject();
			for (const [key, child] of Object.entries(value)) {
				if (RESERVED_PATH_KEYS.has(key)) {
					continue;
				}
				copy[key] = clonePlainValue(child);
			}
			return copy;
		}
	}

	return value;
}

function deepMerge(base: unknown, override: unknown): unknown {
	if (Array.isArray(base) && Array.isArray(override)) {
		return override.map((value, index) => deepMerge(base[index], value));
	}

	if (isPlainObject(base) && isPlainObject(override)) {
		const result = createValueObject();
		for (const [key, value] of Object.entries(base)) {
			if (!RESERVED_PATH_KEYS.has(key)) {
				result[key] = value;
			}
		}
		for (const [key, value] of Object.entries(override)) {
			if (RESERVED_PATH_KEYS.has(key)) {
				continue;
			}
			result[key] = Object.hasOwn(result, key) ? deepMerge(result[key], value) : value;
		}
		return result;
	}

	return override === undefined ? base : override;
}
