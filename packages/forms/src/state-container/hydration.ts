import { isPlainObject } from '@/lib/is-plain-object';
import { flatIds, syncIds } from './row-ids';
import type { FormStateHydration, FormStateSnapshot } from './types';
import { toInternal, type NullMap } from './value-tree';

/**
 * Thrown when a hydration cannot come from a real snapshot: its row ids do not match its own values.
 *
 * @remarks A host that serializes `toHydration(container.getServerSnapshot())` never sees it. It means the object was edited, or built by hand.
 */
export class FormStateHydrationError extends Error {
	override readonly name = 'FormStateHydrationError';
}

/** What a client needs of a server's snapshot to start from the same state: its values and row ids, both plain and serializable. */
export const toHydration = (snapshot: FormStateSnapshot): FormStateHydration => ({
	values: snapshot.values,
	rowIds: snapshot.rowIds,
});

/**
 * The values of a hydration as the container holds them, after checking that its row ids match them.
 *
 * @remarks
 * Every array of the values has exactly one entry in `rowIds`, with one id for each of its rows and no id used
 * twice in the hydration; there is no entry for anything else. Arrays that hold opaque values, such as files,
 * have no row ids and no entry.
 */
export function readHydration(hydration: FormStateHydration): NullMap {
	if (!isPlainObject(hydration) || !isPlainObject(hydration.values) || !isPlainObject(hydration.rowIds)) {
		throw new FormStateHydrationError('A hydration is an object with the values and the rowIds of a snapshot.');
	}
	const values = toInternal(hydration.values) as NullMap;
	let placeholder = 0;
	const expected = flatIds(syncIds(undefined, values, () => `${++placeholder}`));
	const given = hydration.rowIds;
	const seen = new Set<string>();
	for (const path of Object.keys(expected)) {
		const ids: unknown = Object.hasOwn(given, path) ? given[path] : undefined;
		if (!Array.isArray(ids)) throw new FormStateHydrationError(`The hydration has no row ids for '${path}'.`);
		if (ids.length !== expected[path].length) {
			throw new FormStateHydrationError(
				`The hydration has ${ids.length} row ids for '${path}', which has ${expected[path].length} rows.`,
			);
		}
		for (const id of ids) {
			if (typeof id !== 'string' || id === '' || seen.has(id)) {
				throw new FormStateHydrationError(`The hydration has an invalid or repeated row id for '${path}'.`);
			}
			seen.add(id);
		}
	}
	for (const path of Object.keys(given)) {
		if (!Object.hasOwn(expected, path)) {
			throw new FormStateHydrationError(
				`The hydration has row ids for '${path}', which is not an array in its values.`,
			);
		}
	}
	return values;
}
