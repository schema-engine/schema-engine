import { getValueAtPath } from '@/lib/path-values';
import { isPlainObject } from '@/lib/is-plain-object';
import type { FormStoreError } from './types';
import { createMap, isOpaque, join, stabilize, type NullMap } from './value-tree';

/**
 * Flattens the nested errors `validateFormValues` returns into one error per dotted path.
 *
 * @remarks
 * A leaf is an object carrying a string `type` and `message`; anything else nested is a container.
 */
export function flattenErrors(errors: unknown, path = '', out: NullMap<FormStoreError> = createMap()) {
	if (isPlainObject(errors) && typeof errors.type === 'string' && typeof errors.message === 'string') {
		if (path) out[path] = Object.freeze({ type: errors.type, message: errors.message });
		return out;
	}
	if (Array.isArray(errors)) {
		errors.forEach((child, index) => flattenErrors(child, join(path, String(index)), out));
	} else if (isPlainObject(errors)) {
		for (const [key, child] of Object.entries(errors)) flattenErrors(child, join(path, key), out);
	}
	return out;
}

/**
 * Moves the entries below an array's rows to the rows' new positions.
 *
 * @param mapping - The new index of an old row, or `undefined` for a row whose state is dropped.
 */
export function remapRows<T>(
	state: NullMap<T>,
	arrayPath: string,
	mapping: (oldIndex: number) => number | undefined,
): NullMap<T> {
	const prefix = `${arrayPath}.`;
	const next = createMap<T>();
	for (const key of Object.keys(state)) {
		if (!key.startsWith(prefix)) {
			next[key] = state[key];
			continue;
		}
		const [segment, ...rest] = key.slice(prefix.length).split('.');
		const index = /^\d+$/.test(segment) ? mapping(Number(segment)) : segment;
		if (index !== undefined) next[[arrayPath, index, ...rest].join('.')] = state[key];
	}
	return stabilize(state, next);
}

/**
 * Reconciles row ids with every structural array found in `branch`, which lives at `path`.
 *
 * @remarks
 * An array keeps its ids by position while its length allows, so replacing a branch with one of the
 * same shape does not remount its rows. Ids of arrays that are gone are dropped.
 */
export function syncRowIds(
	rowIds: NullMap<readonly string[]>,
	path: string,
	branch: unknown,
	mintId: () => string,
): NullMap<readonly string[]> {
	const next = createMap<readonly string[]>();
	for (const key of Object.keys(rowIds)) {
		if (path !== '' && key !== path && !key.startsWith(`${path}.`)) next[key] = rowIds[key];
	}
	const visit = (value: unknown, at: string): void => {
		if (value === null || typeof value !== 'object' || isOpaque(value)) return;
		if (Array.isArray(value)) {
			const previous = rowIds[at] ?? [];
			const ids =
				previous.length === value.length
					? previous
					: previous.length > value.length
						? Object.freeze(previous.slice(0, value.length))
						: Object.freeze([
								...previous,
								...Array.from({ length: value.length - previous.length }, mintId),
							]);
			next[at] = ids;
			value.forEach((item, index) => visit(item, join(at, String(index))));
			return;
		}
		for (const [key, child] of Object.entries(value)) visit(child, join(at, key));
	};
	visit(branch, path);
	return stabilize(rowIds, next);
}

/** Whether `path` can still hold a value: its parent is a container, and an array parent has that row. */
export function pathExists(values: NullMap, path: string): boolean {
	const cut = path.lastIndexOf('.');
	if (cut < 0) return true;
	const parent = getValueAtPath(values, path.slice(0, cut));
	if (parent === null || typeof parent !== 'object') return false;
	return !Array.isArray(parent) || Number(path.slice(cut + 1)) < parent.length;
}

/**
 * Drops the entries below `path` whose location no longer exists in `values`.
 *
 * @remarks
 * A branch written over `path` can remove rows and objects that carried field state. Entries for them
 * are dropped, so a row added at the same index later does not inherit them.
 */
export function pruneMissing<T>(state: NullMap<T>, path: string, values: NullMap): NullMap<T> {
	const next = createMap<T>();
	for (const key of Object.keys(state)) {
		if (key === path || (path && !key.startsWith(`${path}.`)) || pathExists(values, key)) next[key] = state[key];
	}
	return stabilize(state, next);
}
