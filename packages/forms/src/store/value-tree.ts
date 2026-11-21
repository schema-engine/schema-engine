import { isPlainObject } from '@/lib/is-plain-object';
import { assertWritablePathKey, isReservedPathKey } from '@/lib/reserved-path-keys';

/** A map held by the store: null-prototype, replaced rather than mutated. */
export type NullMap<T = unknown> = Record<string, T>;

export function createMap<T = unknown>(): NullMap<T> {
	return Object.create(null) as NullMap<T>;
}

/**
 * Whether a value is compared by reference and never copied, frozen or diffed.
 *
 * @remarks
 * Plain records and primitives are structural. An array is structural only when each of its items is,
 * so `string[]` and arrays of rows are, and a `File[]` from a drop zone is not: copying it would break
 * the identity a control holds on to.
 */
export function isOpaque(value: unknown): boolean {
	if (value === null || typeof value !== 'object') return false;
	if (Array.isArray(value)) return value.some(isOpaque);
	return !isPlainObject(value);
}

/** Copies the structural part of `value` into null-prototype maps; opaque values are kept as they are. */
export function toInternal(value: unknown): unknown {
	if (isOpaque(value)) return value;
	if (Array.isArray(value)) return value.map(toInternal);
	if (isPlainObject(value)) {
		const copy = createMap();
		for (const [key, child] of Object.entries(value)) {
			if (!isReservedPathKey(key)) copy[key] = toInternal(child);
		}
		return copy;
	}
	return value;
}

const plainCache = new WeakMap<object, unknown>();

/**
 * The frozen plain-record view of an internal value.
 *
 * @remarks
 * Memoized per internal node, so a branch that did not change comes back as the same object.
 */
export function toPlain(value: unknown): unknown {
	if (value === null || typeof value !== 'object') return value;
	const cached = plainCache.get(value);
	if (cached !== undefined) return cached;
	let plain: unknown = value;
	if (!isOpaque(value)) {
		if (Array.isArray(value)) {
			plain = Object.freeze(value.map(toPlain));
		} else {
			const copy: Record<string, unknown> = {};
			for (const [key, child] of Object.entries(value)) copy[key] = toPlain(child);
			plain = Object.freeze(copy);
		}
	}
	plainCache.set(value, plain);
	return plain;
}

/** Frozen plain view of a flat map; entries are carried over as they are. */
export function toPlainMap<T>(map: NullMap<T>): Readonly<Record<string, T>> {
	const cached = plainCache.get(map);
	if (cached !== undefined) return cached as Readonly<Record<string, T>>;
	const plain = Object.freeze({ ...map });
	plainCache.set(map, plain);
	return plain;
}

/**
 * The previous value when `next` has the same keys holding the same references, else `next`.
 */
export function stabilize<T extends NullMap>(previous: T, next: T): T {
	const nextKeys = Object.keys(next);
	if (nextKeys.length !== Object.keys(previous).length) return next;
	return nextKeys.every((key) => Object.hasOwn(previous, key) && Object.is(previous[key], next[key]))
		? previous
		: next;
}

/**
 * Merges `next` into `previous`, keeping every branch that holds the same content as its old reference.
 */
export function reconcile(previous: unknown, next: unknown): unknown {
	if (Object.is(previous, next)) return previous;
	if (Array.isArray(previous) && Array.isArray(next) && !isOpaque(previous) && !isOpaque(next)) {
		const merged = next.map((item, index) => reconcile(previous[index], item));
		return merged.length === previous.length && merged.every((item, index) => item === previous[index])
			? previous
			: merged;
	}
	if (isPlainObject(previous) && isPlainObject(next) && !Array.isArray(previous) && !Array.isArray(next)) {
		const keys = Object.keys(next);
		const merged = createMap();
		for (const key of keys) {
			merged[key] = Object.hasOwn(previous, key) ? reconcile(previous[key], next[key]) : next[key];
		}
		return keys.length === Object.keys(previous).length &&
			keys.every((key) => Object.hasOwn(previous, key) && merged[key] === previous[key])
			? previous
			: merged;
	}
	return next;
}

/**
 * Writes `value` at `path` without mutating `root`: only the containers along the path are copied.
 *
 * @remarks
 * A missing or non-container parent becomes an array when the next segment is an index and a map
 * otherwise. Returns `root` itself when the value at `path` is already `value`. An empty `path` replaces the root,
 * but only with a plain record; anything else leaves `root` as it is.
 */
export function setIn(root: NullMap, path: string, value: unknown): NullMap {
	if (!path) return isPlainObject(value) ? (value as NullMap) : root;
	const segments = path.split('.');
	segments.forEach(assertWritablePathKey);
	const write = (node: unknown, depth: number): unknown => {
		const segment = segments[depth];
		const isLast = depth === segments.length - 1;
		const container =
			node !== null && typeof node === 'object' && !isOpaque(node)
				? node
				: /^\d+$/.test(segment)
					? []
					: createMap();
		const current = (container as Record<string, unknown>)[segment];
		const child = isLast ? value : write(current, depth + 1);
		if (Object.is(child, current) && container === node) return node;
		if (Array.isArray(container)) {
			const copy = [...container];
			copy[Number(segment)] = child;
			return copy;
		}
		const copy = createMap();
		for (const key of Object.keys(container)) copy[key] = (container as NullMap)[key];
		copy[segment] = child;
		return copy;
	};
	return write(root, 0) as NullMap;
}

/** Whether `path` is `scope` or lies below it. */
export function isWithin(path: string, scope: string): boolean {
	return scope === '' || path === scope || path.startsWith(`${scope}.`);
}

/**
 * Marks every path whose value differs from the default, and the containers around it.
 *
 * @remarks
 * An opaque value is compared by reference. The walk stops at any branch shared with the defaults.
 */
export function collectDirty(value: unknown, defaultValue: unknown, path: string, out: NullMap<true>): boolean {
	if (Object.is(value, defaultValue)) return false;
	let dirty: boolean;
	if (Array.isArray(value) && Array.isArray(defaultValue) && !isOpaque(value) && !isOpaque(defaultValue)) {
		dirty = value.length !== defaultValue.length;
		for (let index = 0; index < Math.max(value.length, defaultValue.length); index += 1) {
			dirty = collectDirty(value[index], defaultValue[index], join(path, String(index)), out) || dirty;
		}
	} else if (
		isPlainObject(value) &&
		isPlainObject(defaultValue) &&
		!Array.isArray(value) &&
		!Array.isArray(defaultValue)
	) {
		dirty = false;
		for (const key of new Set([...Object.keys(value), ...Object.keys(defaultValue)])) {
			dirty = collectDirty(value[key], defaultValue[key], join(path, key), out) || dirty;
		}
	} else {
		dirty = true;
		if (Array.isArray(value) && !isOpaque(value)) {
			value.forEach((item, index) => collectDirty(item, undefined, join(path, String(index)), out));
		} else if (isPlainObject(value) && !Array.isArray(value)) {
			for (const key of Object.keys(value)) collectDirty(value[key], undefined, join(path, key), out);
		}
	}
	if (dirty && path) out[path] = true;
	return dirty;
}

export function join(path: string, segment: string): string {
	return path ? `${path}.${segment}` : segment;
}
