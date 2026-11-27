import { safeParseNode, type NodeLookup, type ParseOptions, type RegistryIssue } from './parse-node.js';
import { RegistryError } from './registry-error.js';
import type { Accepted, CheckLookup, NodeData, TreeRegistration } from './tree-types.js';
import type { StandardSchemaIssue } from './standard-schema.js';
import type { ChildPath } from './types.js';

/**
 * One node of a validated document: its registration, its data, where it sits and its children.
 *
 * @remarks
 * `$type` is the node's own, repeated at the top for the same reason as on {@link SafeParseNodeResult}: checking it
 * narrows `registration` and `data` together. `data` is the node's composed data: the schema output with each child
 * path replaced by the data of the children found there, so it is the same object the parent's data holds at that
 * position, and `tree.data` is the whole parsed document. `children` has one entry per child path the registration
 * declares, in declaration order, each `{ keys, nodes }` with `nodes` empty when the node holds none there, in document
 * order. Find an entry by its `keys`, never by index (`children.find(({ keys }) => keys.join('.') === 'sections')`), or
 * read `data`, which is typed per path. `TAll` is the whole union of registrations, so a child is typed by what its
 * path accepts, or by the whole union without `accepts`.
 */
export type ParsedNode<
	TAll extends TreeRegistration,
	TRegistration extends TreeRegistration = TAll,
> = TRegistration extends unknown
	? {
			$type: TRegistration['$type'];
			registration: TRegistration;
			data: NodeData<TAll, TRegistration>;
			path: NonNullable<StandardSchemaIssue['path']>;
			children: ParsedChildren<TAll, TRegistration['childPaths']>;
		}
	: never;

/** The `children` of a node: a tuple over the declared child paths, each `nodes` typed by its `accepts`. */
type ParsedChildren<TAll extends TreeRegistration, TPaths> = TPaths extends readonly ChildPath[]
	? {
			readonly [I in keyof TPaths]: TPaths[I] extends ChildPath
				? { keys: TPaths[I]['keys']; nodes: readonly ParsedNode<TAll, Accepted<TAll, TPaths[I]>>[] }
				: never;
		}
	: readonly [];

/** What {@link safeParseTree} returns: the tree of a document with no issue, or every issue found. */
export type SafeParseTreeResult<TAll extends TreeRegistration, TRoot extends TreeRegistration = TAll> =
	{ success: true; tree: ParsedNode<TAll, TRoot> } | { success: false; issues: RegistryIssue[] };

/**
 * The registrations a root may be: those `accepts` names, but only when the options type has `accepts`, not when it
 * only may.
 */
type RootOf<TAll extends TreeRegistration, TOptions> = TOptions extends {
	readonly accepts: readonly (infer TName)[];
}
	? Extract<TAll, { $type: TName }>
	: TAll;

interface RuntimeNode {
	$type: string;
	registration: TreeRegistration;
	data: unknown;
	path: NonNullable<StandardSchemaIssue['path']>;
	children: { keys: readonly string[]; nodes: RuntimeNode[] }[];
}

type PlainObject = Record<PropertyKey, unknown>;

function isRecord(value: unknown): value is PlainObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlainObject(value: unknown): value is PlainObject {
	if (!isRecord(value)) return false;
	const prototype: unknown = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

/**
 * The value an object holds at keys, through own entries only, or `undefined` when an intermediate is absent or not an
 * object that `isObject` accepts.
 *
 * @remarks
 * Only own keys count: a key a plain object inherits, such as `constructor`, is no child.
 */
function valueAt(
	root: PlainObject,
	keys: readonly string[],
	isObject: (value: unknown) => value is PlainObject,
): unknown {
	let current: unknown = root;
	for (const key of keys) {
		if (!isObject(current) || !Object.hasOwn(current, key)) return undefined;
		current = current[key];
	}
	return current;
}

/**
 * Set an own, enumerable entry.
 *
 * @remarks
 * A plain assignment under the key `__proto__` would replace the object's prototype instead of adding an entry.
 */
function setOwn(target: PlainObject, key: string, value: unknown): void {
	Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
}

/**
 * A copy of a node's schema output with each child slot replaced, without touching the output.
 *
 * @remarks
 * The output shares references with the authored document (a loose object returns the authored array), so it is
 * never written to. The root and each object on a path are shallow-copied once, and two paths with a shared prefix
 * share that copy.
 */
function withChildData(
	output: PlainObject,
	writes: readonly { keys: readonly string[]; value: unknown }[],
): PlainObject {
	const root: PlainObject = { ...output };
	const copies = new Set<object>([root]);
	for (const { keys, value } of writes) {
		let current = root;
		for (const key of keys.slice(0, -1)) {
			let next = current[key] as PlainObject;
			if (!copies.has(next)) {
				next = { ...next };
				copies.add(next);
				setOwn(current, key, next);
			}
			current = next;
		}
		setOwn(current, keys[keys.length - 1]!, value);
	}
	return root;
}

/**
 * Check a whole document, node by node, without throwing for a bad document.
 *
 * @param registry - Where each node's `$type` finds its registration
 * @param root - The document's root node, as it arrived
 * @param options - Where the root sits in a larger document (`path`, which starts every issue's `path`) and which
 * `$type`s the root may have (`accepts`), see {@link ParseOptions}
 *
 * @remarks
 * Each node goes through {@link safeParseNode} with its full path, and `accepts` of the position it sits in (the
 * option for the root, the child path's own below), so the issues are those of one node, at the position the document
 * has them. A registration says where its children are with `childPaths`, each path read from the node as authored:
 *
 * | Value at the child path | Result |
 * | --- | --- |
 * | key absent, or an intermediate absent or not an object | no children; `data` keeps the schema output there |
 * | `undefined` | no children, as absent |
 * | `null` or another primitive | issue `registry/not-a-node` at the path |
 * | an object | one child |
 * | an array | each item is a child, at `[...path, index]`; an item that is not an object is an issue |
 * | an empty array | no children; `data` holds `[]` |
 *
 * A node that contains itself is `registry/contains-itself`. A node whose own schema fails is not walked further, but
 * its siblings still are, so one call reports every issue of the document. The tree is returned only when there are
 * none: `tree.data` is then the parsed document, each node's schema output with the children's data at its child
 * paths, in document order. Each child is parsed once, from the authored value, and the authored document and the
 * schema outputs are never written to.
 *
 * The parent schema owns, at a child path, whether the value may be missing, list or single, and list bounds; it does
 * not own the children, whose data replaces whatever the schema returned there. For each node it parses, `safeParseTree`
 * holds the schema to that contract and throws a {@link RegistryError} when it breaks it, since that is a bug of the
 * registration and no issue of the document: `'schema-changes-type'` when the output is not a plain object whose own
 * `$type` equals the node's, and `'schema-breaks-child-path'` when, where the document fills a child path, the output
 * lacks the keys down to it as plain objects or the same cardinality (an array of the same length for an array, an
 * object for an object), or when, where the document leaves a path empty, the output holds anything but nothing,
 * `undefined` or `[]`: a default that holds nodes. A transform of the parent at a filled slot (a reorder, say) is
 * discarded, not detected, so slots stay opaque to the parent's schema.
 *
 * The result is typed from the registrations: with a literal `accepts` the root narrows, and `tree.data` types each
 * child path by what it accepts. The walk itself reads registrations through one widened view of the lookup, and
 * the function returns the tree through one cast to that type: every node in it was built from a registration of the
 * lookup by its own `$type`, which TypeScript cannot follow at runtime.
 *
 * @throws {RegistryError} Code `'schema-changes-type'` or `'schema-breaks-child-path'`, as above
 * @throws {Error} When a registration's schema validates asynchronously, as {@link safeParseNode} does, and when
 * `accepts` is an empty list
 */
export function safeParseTree<
	TAll extends TreeRegistration,
	const TOptions extends ParseOptions<TAll['$type']> = ParseOptions<TAll['$type']>,
>(
	registry: NodeLookup<TAll> & CheckLookup<TAll>,
	root: unknown,
	options?: TOptions,
): SafeParseTreeResult<TAll, RootOf<TAll, TOptions>> {
	const lookup: NodeLookup<TreeRegistration> = registry;
	const issues: RegistryIssue[] = [];
	const label = lookup.kind === undefined ? '' : `${lookup.kind} `;

	const kind = lookup.kind === undefined ? {} : { kind: lookup.kind };

	function brokenSlot(type: string, keys: readonly string[]): RegistryError {
		return new RegistryError(
			'schema-breaks-child-path',
			`${label}'${type}' schema output does not keep the child path '${keys.join('.')}' as the document has it.`,
			{ ...kind, $type: type, childPath: keys },
		);
	}

	function walk(
		node: unknown,
		nodePath: NonNullable<StandardSchemaIssue['path']>,
		ancestors: readonly unknown[],
		accepts: readonly string[] | undefined,
	): RuntimeNode | undefined {
		if (ancestors.includes(node)) {
			issues.push({ code: 'registry/contains-itself', message: 'A node cannot contain itself.', path: nodePath });
			return undefined;
		}
		const parsed = safeParseNode(lookup, node, { path: nodePath, accepts });
		if (!parsed.success) {
			issues.push(...parsed.issues);
			return undefined;
		}
		const { $type: type, registration } = parsed;
		const output: unknown = parsed.data;
		if (!isPlainObject(output) || !Object.hasOwn(output, '$type') || output.$type !== type) {
			throw new RegistryError(
				'schema-changes-type',
				`${label}'${type}' schema output must keep its $type '${type}'.`,
				{ ...kind, $type: type },
			);
		}

		const authored = node as PlainObject;
		const trail = [...ancestors, node];
		const groups: RuntimeNode['children'] = [];
		const writes: { keys: readonly string[]; value: unknown }[] = [];
		let complete = true;
		for (const { keys, accepts: childAccepts } of registration.childPaths ?? []) {
			const nodes: RuntimeNode[] = [];
			groups.push({ keys, nodes });
			const slot = valueAt(authored, keys, isRecord);
			const held = valueAt(output, keys, isPlainObject);
			const childPath = [...nodePath, ...keys];
			if (slot === undefined) {
				if (held !== undefined && !(Array.isArray(held) && held.length === 0)) {
					throw brokenSlot(type, keys);
				}
			} else if (Array.isArray(slot)) {
				if (!Array.isArray(held) || held.length !== slot.length) throw brokenSlot(type, keys);
				const items = slot.map((item, index) => walk(item, [...childPath, index], trail, childAccepts));
				nodes.push(...items.filter((item) => item !== undefined));
				if (nodes.length === items.length) writes.push({ keys, value: nodes.map((item) => item.data) });
				else complete = false;
			} else if (isRecord(slot)) {
				if (!isRecord(held)) throw brokenSlot(type, keys);
				const child = walk(slot, childPath, trail, childAccepts);
				if (child) {
					nodes.push(child);
					writes.push({ keys, value: child.data });
				} else {
					complete = false;
				}
			} else {
				issues.push({
					code: 'registry/not-a-node',
					message: 'Expected a node or a list of nodes.',
					path: childPath,
				});
				complete = false;
			}
		}
		if (!complete) return undefined;
		return {
			$type: type,
			registration,
			data: writes.length === 0 ? output : withChildData(output, writes),
			path: nodePath,
			children: groups,
		};
	}

	const tree = walk(root, options?.path ?? [], [], options?.accepts);
	return (tree && issues.length === 0 ? { success: true, tree } : { success: false, issues }) as SafeParseTreeResult<
		TAll,
		RootOf<TAll, TOptions>
	>;
}
