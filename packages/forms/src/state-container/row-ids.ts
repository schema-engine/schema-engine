import { isOpaque, join, createMap, type NullMap } from './value-tree';

/**
 * Row identity, kept in the shape of the values.
 *
 * @remarks
 * An array of rows is an array of {@link RowNode}, one per row, holding the row's id and the ids of
 * arrays nested in it; an object is a null-prototype map. Ids give a row an identity that survives a
 * move: a field array renders by it, and a late validation result finds its row by it.
 */
export interface RowNode {
	readonly id: string;
	readonly below?: IdTree;
}

export interface IdMap {
	readonly [key: string]: IdTree;
}

export type IdTree = readonly RowNode[] | IdMap;

const isRows = (node: IdTree | undefined): node is readonly RowNode[] => Array.isArray(node);

/** The ids of `value` reconciled with `previous`: a row keeps its id by position, new rows get new ids. */
export function syncIds(previous: IdTree | undefined, value: unknown, mint: () => string): IdTree | undefined {
	if (value === null || typeof value !== 'object' || isOpaque(value)) return undefined;
	if (Array.isArray(value)) {
		const before = isRows(previous) ? previous : [];
		const rows = value.map((item, index): RowNode => {
			const row = before[index];
			const below = syncIds(row?.below, item, mint);
			if (row && Object.is(row.below, below)) return row;
			return below === undefined ? { id: row?.id ?? mint() } : { id: row?.id ?? mint(), below };
		});
		return before.length === rows.length && rows.every((row, index) => row === before[index]) ? before : rows;
	}
	const before = previous && !isRows(previous) ? previous : undefined;
	const next = createMap<IdTree>();
	for (const key of Object.keys(value)) {
		const child = syncIds(before?.[key], (value as NullMap)[key], mint);
		if (child !== undefined) next[key] = child;
	}
	const keys = Object.keys(next);
	if (keys.length === 0) return undefined;
	return before && keys.length === Object.keys(before).length && keys.every((key) => next[key] === before[key])
		? before
		: next;
}

/** The ids tree at `path`; an array index steps into that row's nested ids. */
export function idsAt(tree: IdTree | undefined, path: string): IdTree | undefined {
	let current = tree;
	for (const segment of path ? path.split('.') : []) {
		if (current === undefined) return undefined;
		current = isRows(current) ? current[Number(segment)]?.below : current[segment];
	}
	return current;
}

/** Replaces the ids tree at `path`, creating nothing: a missing row or object on the way leaves `tree` as it is. */
export function replaceIdsAt(tree: IdTree | undefined, path: string, node: IdTree | undefined): IdTree | undefined {
	if (!path) return node;
	const segments = path.split('.');
	const write = (current: IdTree | undefined, depth: number): IdTree | undefined => {
		const segment = segments[depth];
		const last = depth === segments.length - 1;
		if (isRows(current)) {
			const row = current[Number(segment)];
			if (!row) return current;
			const below = last ? node : write(row.below, depth + 1);
			if (Object.is(below, row.below)) return current;
			return current.map((candidate) =>
				candidate === row ? (below === undefined ? { id: row.id } : { id: row.id, below }) : candidate,
			);
		}
		const base = current ?? createMap<IdTree>();
		const child = last ? node : write(base[segment], depth + 1);
		if (Object.is(child, base[segment])) return current;
		const next = createMap<IdTree>();
		for (const key of Object.keys(base)) next[key] = base[key];
		if (child === undefined) delete next[segment];
		else next[segment] = child;
		return Object.keys(next).length === 0 ? undefined : next;
	};
	return write(tree, 0);
}

const idsCache = new WeakMap<readonly RowNode[], readonly string[]>();

/** The ids of an array's rows as a flat map from array path to row ids, for hosts that render by id. */
export function flatIds(tree: IdTree | undefined, path = '', out: NullMap<readonly string[]> = createMap()) {
	if (tree === undefined) return out;
	if (isRows(tree)) {
		let ids = idsCache.get(tree);
		if (!ids) idsCache.set(tree, (ids = Object.freeze(tree.map((row) => row.id))));
		out[path] = ids;
		tree.forEach((row, index) => flatIds(row.below, join(path, String(index)), out));
	} else {
		for (const key of Object.keys(tree)) flatIds(tree[key], join(path, key), out);
	}
	return out;
}

/** Where a path was, as the rows it ran through: enough to find the same fields after rows moved. */
export interface RowAnchor {
	readonly path: string;
	/** The id of the row at each segment that stepped into an array, by segment position. */
	readonly rows: ReadonlyMap<number, string>;
}

export function anchorOf(tree: IdTree | undefined, path: string): RowAnchor {
	const rows = new Map<number, string>();
	let current = tree;
	path.split('.').forEach((segment, position) => {
		if (isRows(current)) {
			const row = current[Number(segment)];
			if (row) rows.set(position, row.id);
			current = row?.below;
		} else {
			current = current?.[segment];
		}
	});
	return { path, rows };
}

/** The path the anchored fields have in `tree` now, or `undefined` when one of their rows is gone. */
export function resolveAnchor(anchor: RowAnchor, tree: IdTree | undefined): string | undefined {
	const resolved: string[] = [];
	let current = tree;
	for (const [position, segment] of anchor.path.split('.').entries()) {
		const id = anchor.rows.get(position);
		if (isRows(current) && id !== undefined) {
			const index = current.findIndex((row) => row.id === id);
			if (index < 0) return undefined;
			resolved.push(String(index));
			current = current[index].below;
		} else {
			resolved.push(segment);
			current = isRows(current) ? current[Number(segment)]?.below : current?.[segment];
		}
	}
	return resolved.join('.');
}
