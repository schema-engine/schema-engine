import { isOpaque, join, createMap, type NullMap } from './value-tree';

/**
 * Field state kept in the shape of the values, one slot per node.
 *
 * @remarks
 * A node holds the state of its own path in `self` and the state of the paths below it in `children`: an
 * array with one element per row where the value is an array, a null-prototype map where it is an object.
 * A node's `self` is never inferred from its children or its parent, so `contacts` and `contacts.0.email`
 * each hold their own, and the form itself is the root node. A row operation is one splice of the
 * `children` array, which moves each row's state with it. Nodes with nothing in them are never stored.
 */
export interface Node<T> {
	readonly self?: T;
	readonly children?: Children<T>;
}

export type Children<T> = readonly (Node<T> | undefined)[] | { readonly [key: string]: Node<T> };

export type Tree<T> = Node<T> | undefined;

/** Whether the value at a path is an array, which decides the kind of children its state node gets. */
export type IsArrayAt = (path: string) => boolean;

const segmentsOf = (path: string): string[] => (path ? path.split('.') : []);

function childAt<T>(node: Node<T> | undefined, segment: string): Node<T> | undefined {
	const children = node?.children;
	if (!children) return undefined;
	if (Array.isArray(children)) return children[Number(segment)];
	return Object.hasOwn(children, segment) ? (children as Record<string, Node<T>>)[segment] : undefined;
}

function node<T>(self: T | undefined, children: Children<T> | undefined): Node<T> | undefined {
	if (self === undefined && children === undefined) return undefined;
	return children === undefined ? { self } : self === undefined ? { children } : { self, children };
}

function withChild<T>(
	parent: Node<T> | undefined,
	segment: string,
	child: Node<T> | undefined,
	isArray: boolean,
): Node<T> | undefined {
	const children = parent?.children;
	if (Array.isArray(children) || (!children && isArray)) {
		const rows = (children ?? []) as readonly (Node<T> | undefined)[];
		const index = Number(segment);
		const next = Array.from({ length: Math.max(rows.length, index + 1) }, (_, i) => rows[i]);
		next[index] = child;
		return node(parent?.self, trimmed(next));
	}
	const next = createMap<Node<T>>();
	for (const [key, value] of Object.entries((children ?? {}) as Record<string, Node<T>>)) next[key] = value;
	if (child === undefined) delete next[segment];
	else next[segment] = child;
	return node(parent?.self, Object.keys(next).length === 0 ? undefined : next);
}

function trimmed<T>(rows: readonly (Node<T> | undefined)[]): Children<T> | undefined {
	let length = rows.length;
	while (length > 0 && rows[length - 1] === undefined) length -= 1;
	return length === 0 ? undefined : rows.length === length ? rows : rows.slice(0, length);
}

/** Rewrites the node at `path`, copying only the nodes along the path; nothing is created for `undefined`. */
function update<T>(
	tree: Tree<T>,
	path: string,
	isArrayAt: IsArrayAt,
	change: (current: Node<T> | undefined) => Node<T> | undefined,
): Tree<T> {
	const segments = segmentsOf(path);
	const write = (current: Node<T> | undefined, depth: number, prefix: string): Node<T> | undefined => {
		if (depth === segments.length) return change(current);
		const existing = childAt(current, segments[depth]);
		const child = write(existing, depth + 1, join(prefix, segments[depth]));
		if (Object.is(child, existing)) return current;
		return withChild(current, segments[depth], child, isArrayAt(prefix));
	};
	return write(tree, 0, '');
}

/** The node at `path`. */
export function nodeAt<T>(tree: Tree<T>, path: string): Node<T> | undefined {
	return segmentsOf(path).reduce<Node<T> | undefined>((current, segment) => childAt(current, segment), tree);
}

/** The state of exactly `path`. */
export function selfAt<T>(tree: Tree<T>, path: string): T | undefined {
	return nodeAt(tree, path)?.self;
}

/** Whether `path` or a path around it, the form included, holds a mark. */
export function coveredAt<T>(tree: Tree<T>, path: string): boolean {
	let current = tree;
	if (current?.self !== undefined) return true;
	for (const segment of segmentsOf(path)) {
		current = childAt(current, segment);
		if (current === undefined) return false;
		if (current.self !== undefined) return true;
	}
	return false;
}

/** Sets the state of exactly `path`; `undefined` clears it. */
export function setSelfAt<T>(tree: Tree<T>, path: string, self: T | undefined, isArrayAt: IsArrayAt): Tree<T> {
	return update(tree, path, isArrayAt, (current) => node(self, current?.children));
}

/** Marks `path` unless it is already covered. */
export function markAt(tree: Tree<true>, path: string, isArrayAt: IsArrayAt): Tree<true> {
	return coveredAt(tree, path) ? tree : setSelfAt(tree, path, true, isArrayAt);
}

/** Clears the state of `path` and of everything below it. */
export function clearAt<T>(tree: Tree<T>, path: string): Tree<T> {
	return update(
		tree,
		path,
		() => false,
		() => undefined,
	);
}

/** Clears the state of exactly `path`, keeping what is below it. */
export function clearSelfAt<T>(tree: Tree<T>, path: string): Tree<T> {
	return update(
		tree,
		path,
		() => false,
		(current) => node(undefined, current?.children),
	);
}

/** Clears the state of the paths around `path`, the form included, keeping `path` and what is below it. */
export function clearAround<T>(tree: Tree<T>, path: string): Tree<T> {
	const segments = segmentsOf(path);
	return segments.reduce<Tree<T>>(
		(current, _, depth) => clearSelfAt(current, segments.slice(0, depth).join('.')),
		tree,
	);
}

/**
 * Rebuilds the array at `path` from its old rows: element `i` becomes old row `order[i]`, or nothing for a new row.
 *
 * @remarks This is the splice of a row operation, applied to one tree.
 */
export function reorderAt<T>(tree: Tree<T>, path: string, order: ReadonlyArray<number | undefined>): Tree<T> {
	return update(
		tree,
		path,
		() => false,
		(current) => {
			const rows = current?.children;
			if (!Array.isArray(rows)) return current;
			return node(current?.self, trimmed(order.map((from) => (from === undefined ? undefined : rows[from]))));
		},
	);
}

function conform<T>(current: Node<T>, value: unknown): Node<T> | undefined {
	const children = current.children;
	if (!children) return current;
	const container = value !== null && typeof value === 'object' && !isOpaque(value);
	if (!container || Array.isArray(children) !== Array.isArray(value)) return node(current.self, undefined);
	if (Array.isArray(children)) {
		const rows = (value as unknown[]).length;
		return node(
			current.self,
			trimmed(
				children.slice(0, rows).map((child, index) => child && conform(child, (value as unknown[])[index])),
			),
		);
	}
	const next = createMap<Node<T>>();
	for (const [key, child] of Object.entries(children as Record<string, Node<T>>)) {
		const kept = conform(child, (value as NullMap)[key]);
		if (kept) next[key] = kept;
	}
	return node(current.self, Object.keys(next).length === 0 ? undefined : next);
}

/**
 * Cuts the state at `path` down to the shape of `value`, which was just written there.
 *
 * @remarks
 * Rows past the end of an array, and branches that are no longer a container of their kind, lose their
 * state; the state of `path` itself and of fields an object does not currently hold is kept.
 */
export function conformAt<T>(tree: Tree<T>, path: string, value: unknown): Tree<T> {
	return update(
		tree,
		path,
		() => false,
		(current) => (current ? conform(current, value) : current),
	);
}

/** Every mark of the tree by dotted path; the form's own is at `''`. */
export function entries<T>(tree: Tree<T>, path = '', out: [string, T][] = []): [string, T][] {
	if (!tree) return out;
	if (tree.self !== undefined) out.push([path, tree.self]);
	const children = tree.children;
	if (Array.isArray(children)) {
		children.forEach((child, index) => entries(child, join(path, String(index)), out));
	} else if (children) {
		for (const [key, child] of Object.entries(children as Record<string, Node<T>>)) {
			entries(child, join(path, key), out);
		}
	}
	return out;
}

/** A tree from marks by dotted path. */
export function fromEntries<T>(marks: ReadonlyArray<readonly [string, T]>, isArrayAt: IsArrayAt): Tree<T> {
	return marks.reduce<Tree<T>>((tree, [path, self]) => setSelfAt(tree, path, self, isArrayAt), undefined);
}

/** The previous tree when `next` holds the same state, else `next` with every unchanged branch shared. */
export function stable<T>(previous: Tree<T>, next: Tree<T>): Tree<T> {
	if (Object.is(previous, next) || !previous || !next) return next;
	const before = previous.children;
	const after = next.children;
	let children = after;
	if (Array.isArray(before) && Array.isArray(after)) {
		const merged = after.map((child, index) => stable(before[index], child));
		children =
			merged.length === before.length && merged.every((child, index) => child === before[index])
				? before
				: merged;
	} else if (before && after && !Array.isArray(before) && !Array.isArray(after)) {
		const prior = before as Record<string, Node<T>>;
		const merged = createMap<Node<T>>();
		for (const [key, child] of Object.entries(after as Record<string, Node<T>>)) {
			merged[key] = stable(prior[key], child) as Node<T>;
		}
		children =
			Object.keys(merged).length === Object.keys(prior).length &&
			Object.keys(merged).every((key) => merged[key] === prior[key])
				? before
				: merged;
	}
	return Object.is(previous.self, next.self) && children === before ? previous : node(next.self, children);
}
