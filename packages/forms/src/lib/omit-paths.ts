import { isPlainObject } from './is-plain-object';

type Path = readonly PropertyKey[];

/** `value` without the key at the end of each of `paths`, which all start at `value`. */
function omit(value: Record<string, unknown>, paths: readonly Path[]): Record<string, unknown> {
	const below = new Map<string, Path[]>();
	for (const [head, ...rest] of paths) {
		const key = String(head);
		below.set(key, [...(below.get(key) ?? []), rest]);
	}
	return Object.fromEntries(
		Object.entries(value).flatMap(([key, entry]) => {
			const inside = below.get(key);
			if (!inside) return [[key, entry]];
			if (inside.some((path) => path.length === 0)) return [];
			return [[key, isPlainObject(entry) ? omit(entry, inside) : entry]];
		}),
	);
}

/**
 * Copies `value` without the keys `paths` end at, each a list of object keys from the root.
 *
 * @remarks
 * A path names a field: a key of the object, nested in groups. A list is one field, so a path never goes inside one,
 * and one that does is left alone. Only the plain objects on a path are copied; every other value is reused.
 * A path that names nothing is ignored, and an empty path removes everything.
 */
export function omitPaths(value: Readonly<Record<string, unknown>>, paths: readonly Path[]): Record<string, unknown> {
	return paths.some((path) => path.length === 0) ? {} : omit(value, paths);
}
