import { createMap, isOpaque, join, type NullMap } from './value-tree';

/**
 * Field state kept in the shape of the values.
 *
 * @remarks
 * A node is a container, an array or a null-prototype map, or a leaf: any other defined value. An
 * array holds one element per row, so a row's state travels with the row when rows are spliced. A leaf
 * on a path covers everything below it, which is how an error on a container or a failed check over a
 * branch is kept. Empty containers are never stored, so a tree holds nothing but state.
 */
export type Tree = unknown;

const isIndex = (segment: string): boolean => /^\d+$/.test(segment);

export function isContainer(node: unknown): node is NullMap | unknown[] {
	return Array.isArray(node) || (node !== null && typeof node === 'object' && Object.getPrototypeOf(node) === null);
}

/** A container with trailing and empty entries removed, or `undefined` when nothing is left. */
function normalize(node: NullMap | unknown[]): Tree {
	if (Array.isArray(node)) {
		let length = node.length;
		while (length > 0 && node[length - 1] === undefined) length -= 1;
		return length === 0 ? undefined : length === node.length ? node : node.slice(0, length);
	}
	for (const key of Object.keys(node)) if (node[key] === undefined) delete node[key];
	return Object.keys(node).length === 0 ? undefined : node;
}

/** The node at `path`, or `undefined` when the path is not stored or lies below a leaf. */
export function getAt(tree: Tree, path: string): Tree {
	if (!path) return tree;
	let current = tree;
	for (const segment of path.split('.')) {
		if (!isContainer(current)) return undefined;
		current = (current as Record<string, unknown>)[segment];
	}
	return current;
}

/** Whether `path`, or a path around it, holds a leaf. */
export function coveredAt(tree: Tree, path: string): boolean {
	let current = tree;
	for (const segment of path ? path.split('.') : []) {
		if (current === undefined) return false;
		if (!isContainer(current)) return true;
		current = (current as Record<string, unknown>)[segment];
	}
	return current !== undefined && !isContainer(current);
}

/**
 * Writes `node` at `path` without mutating `tree`; `undefined` clears it.
 *
 * @remarks
 * Only the containers along the path are copied, and the same tree comes back when nothing changed.
 * Writing below a leaf replaces the leaf with a container; clearing below a leaf does nothing.
 */
export function setAt(tree: Tree, path: string, node: Tree): Tree {
	if (!path) return node;
	const segments = path.split('.');
	const write = (current: Tree, depth: number): Tree => {
		const segment = segments[depth];
		const container = isContainer(current) ? current : undefined;
		if (!container && node === undefined) return current;
		const base: NullMap | unknown[] = container ?? (isIndex(segment) ? [] : createMap());
		const previous = (base as Record<string, unknown>)[segment];
		const child = depth === segments.length - 1 ? node : write(previous, depth + 1);
		if (container && Object.is(child, previous)) return current;
		if (Array.isArray(base)) {
			const copy = Array.from({ length: Math.max(base.length, Number(segment) + 1) }, (_, i) => base[i]);
			copy[Number(segment)] = child;
			return normalize(copy);
		}
		const copy = createMap();
		for (const key of Object.keys(base)) copy[key] = (base as NullMap)[key];
		copy[segment] = child;
		return normalize(copy);
	};
	return write(tree, 0);
}

/** The leaf at `path`, or the leaf around it that covers it. */
export function leafAt(tree: Tree, path: string): Tree {
	let current = tree;
	for (const segment of path ? path.split('.') : []) {
		if (current === undefined) return undefined;
		if (!isContainer(current)) return current;
		current = (current as Record<string, unknown>)[segment];
	}
	return isContainer(current) ? undefined : current;
}

/** Marks `path` unless it is already covered. */
export function markAt(tree: Tree, path: string): Tree {
	return coveredAt(tree, path) ? tree : setAt(tree, path, true);
}

/** Every leaf of the tree, by dotted path; a leaf at the root is keyed `''`. */
export function leaves(tree: Tree, path = '', out: NullMap = createMap()): NullMap {
	if (tree === undefined) return out;
	if (!isContainer(tree)) {
		out[path] = tree;
	} else if (Array.isArray(tree)) {
		tree.forEach((child, index) => leaves(child, join(path, String(index)), out));
	} else {
		for (const key of Object.keys(tree)) leaves(tree[key], join(path, key), out);
	}
	return out;
}

/** A tree from flat entries; where a path and one below it are both given, the outer one is kept. */
export function fromEntries(entries: ReadonlyArray<readonly [string, unknown]>): Tree {
	return entries
		.toSorted(([a], [b]) => b.split('.').length - a.split('.').length)
		.reduce<Tree>((tree, [path, leaf]) => setAt(tree, path, leaf), undefined);
}

/**
 * Cuts a tree down to the shape of `value`: rows past the end of an array are dropped, and a branch whose
 * value is no longer a container of its kind is dropped with its state.
 */
export function conform(node: Tree, value: unknown): Tree {
	if (node === undefined || !isContainer(node)) return node;
	if (isOpaque(value) || !isContainer(value) || Array.isArray(node) !== Array.isArray(value)) return undefined;
	if (Array.isArray(node)) {
		const rows = (value as unknown[]).length;
		return normalize(node.slice(0, rows).map((child, index) => conform(child, (value as unknown[])[index])));
	}
	const copy = createMap();
	for (const key of Object.keys(node)) copy[key] = conform(node[key], (value as NullMap)[key]);
	return normalize(copy);
}

/** Applies `conform` to the node at `path`. */
export function conformAt(tree: Tree, path: string, value: unknown): Tree {
	const node = getAt(tree, path);
	return node === undefined ? tree : setAt(tree, path, conform(node, value));
}

/** Rebuilds the array node at `path` from its old rows: element `i` becomes old row `order[i]`, or nothing. */
export function reorderAt(tree: Tree, path: string, order: ReadonlyArray<number | undefined>): Tree {
	const node = getAt(tree, path);
	if (!Array.isArray(node)) return tree;
	return setAt(tree, path, normalize(order.map((from) => (from === undefined ? undefined : node[from]))));
}

/**
 * The previous tree when `next` holds the same state, else `next` with every unchanged branch shared.
 */
export function stable(previous: Tree, next: Tree): Tree {
	if (Object.is(previous, next)) return previous;
	if (Array.isArray(previous) && Array.isArray(next)) {
		const merged = next.map((child, index) => stable(previous[index], child));
		return merged.length === previous.length && merged.every((child, index) => child === previous[index])
			? previous
			: merged;
	}
	if (isContainer(previous) && isContainer(next) && !Array.isArray(previous) && !Array.isArray(next)) {
		const keys = Object.keys(next);
		const merged = createMap();
		for (const key of keys) merged[key] = stable(previous[key], next[key]);
		return keys.length === Object.keys(previous).length &&
			keys.every((key) => Object.hasOwn(previous, key) && merged[key] === previous[key])
			? previous
			: merged;
	}
	return next;
}

/**
 * Combines trees listed from the lowest to the highest precedence.
 *
 * @remarks
 * At a node, the highest tree holding a leaf there wins, and its leaf hides what the others hold below;
 * otherwise the containers are combined key by key.
 */
export function mergeTrees(trees: readonly Tree[]): Tree {
	const present = trees.filter((tree) => tree !== undefined);
	if (present.length <= 1) return present[0];
	const leaf = present.findLast((tree) => !isContainer(tree));
	if (leaf !== undefined) return leaf;
	const last = present[present.length - 1];
	if (Array.isArray(last)) {
		const arrays = present.filter(Array.isArray) as unknown[][];
		const length = Math.max(...arrays.map((array) => array.length));
		return normalize(Array.from({ length }, (_, i) => mergeTrees(arrays.map((array) => array[i]))));
	}
	const maps = present.filter((tree) => !Array.isArray(tree)) as NullMap[];
	const merged = createMap();
	for (const key of new Set(maps.flatMap((map) => Object.keys(map))))
		merged[key] = mergeTrees(maps.map((map) => map[key]));
	return normalize(merged);
}
