import { isPlainObject } from '@/lib/is-plain-object.js';
import type { IdTree, RowNode } from './row-ids.js';
import type { FormStateHydration, FormStateSnapshot } from './types.js';
import { createMap, isStructural, join, toInternalRecord, type NullMap } from './value-tree.js';

/** What a client needs of a server's snapshot to start from the same state: its values and row ids, both plain and serializable. */
export const toHydration = (snapshot: FormStateSnapshot): FormStateHydration => ({
	values: snapshot.values,
	rowIds: snapshot.rowIds,
});

/** A hydration as the container holds it: the values, the ids tree they carry, and every id used. */
export interface ReadHydration {
	readonly values: NullMap;
	readonly ids: IdTree | undefined;
	readonly taken: ReadonlySet<string>;
}

/**
 * The values and row ids of a hydration, checked against each other in one walk of the values.
 *
 * @remarks
 * Every array of the values must have exactly one entry in `rowIds`, with one id for each of its rows and no id
 * used twice in the hydration, and there must be no entry for anything else. Arrays that hold opaque values, such
 * as files, have no row ids and no entry. The ids tree takes each row's id from `rowIds[path][index]` as the walk
 * reaches it.
 */
export function readHydration(hydration: FormStateHydration): ReadHydration {
	if (!isPlainObject(hydration) || !isPlainObject(hydration.values) || !isPlainObject(hydration.rowIds)) {
		throw new Error('A hydration is an object with the values and the rowIds of a snapshot.');
	}
	const given = hydration.rowIds;
	const taken = new Set<string>();
	const used = new Set<string>();
	const idsOf = (value: unknown, path: string): IdTree | undefined => {
		if (!isStructural(value)) return undefined;
		if (Array.isArray(value)) {
			const ids: unknown = Object.hasOwn(given, path) ? given[path] : undefined;
			if (!Array.isArray(ids)) throw new Error(`The hydration has no row ids for '${path}'.`);
			if (ids.length !== value.length) {
				throw new Error(
					`The hydration has ${ids.length} row ids for '${path}', which has ${value.length} rows.`,
				);
			}
			used.add(path);
			return value.map((row, index): RowNode => {
				const id: unknown = ids[index];
				if (typeof id !== 'string' || id === '' || taken.has(id)) {
					throw new Error(`The hydration has an invalid or repeated row id for '${path}'.`);
				}
				taken.add(id);
				const below = idsOf(row, join(path, String(index)));
				return below === undefined ? { id } : { id, below };
			});
		}
		const children = createMap<IdTree>();
		for (const key of Object.keys(value)) {
			const child = idsOf(value[key], join(path, key));
			if (child !== undefined) children[key] = child;
		}
		return Object.keys(children).length === 0 ? undefined : children;
	};
	const values = toInternalRecord(hydration.values);
	const ids = idsOf(values, '');
	for (const path of Object.keys(given)) {
		if (!used.has(path)) {
			throw new Error(`The hydration has row ids for '${path}', which is not an array in its values.`);
		}
	}
	return { values, ids, taken };
}
