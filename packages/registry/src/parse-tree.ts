import { safeParseNode, type NodeLookup } from './parse-node.js';
import type { StandardSchemaIssue } from './standard-schema.js';
import type { BaseRegistration } from './types.js';
import type { StandardSchemaV1 } from '@standard-schema/spec';

type TreeRegistration = Pick<BaseRegistration, 'schema' | 'childPaths'>;

/**
 * One node of a validated document: its registration, the data its schema returned, where it sits and its children.
 *
 * @remarks
 * `$type` is the node's own, repeated at the top for the same reason as on {@link SafeParseNodeResult}: checking it
 * narrows `registration` and `data` together. `children` has one entry per child path the registration declares that
 * the node has a value at, keyed by the keys of the path joined with dots (`['engine', 'controls']` is
 * `'engine.controls'`): a list of nodes for an array, one node otherwise, in document order. A child may be of any
 * registration of the lookup, so `children` holds nodes of the whole union, not of the parent's registration.
 */
export type ParsedNode<TRegistration extends TreeRegistration> = ParsedNodeOf<TRegistration, TRegistration>;

/**
 * One member of {@link ParsedNode} per registration.
 *
 * @remarks
 * `TAll` carries the whole union past the distribution over `TMember`: inside the distributive branch `TMember` is one
 * registration, which would type every child as a node of its parent's registration.
 */
type ParsedNodeOf<TMember extends TreeRegistration, TAll extends TreeRegistration> = TMember extends unknown
	? {
			$type: TMember extends { $type: infer TType extends string } ? TType : string;
			registration: TMember;
			data: StandardSchemaV1.InferOutput<TMember['schema']>;
			path: NonNullable<StandardSchemaIssue['path']>;
			children: Readonly<Record<string, ParsedNode<TAll> | readonly ParsedNode<TAll>[]>>;
		}
	: never;

/** What {@link safeParseTree} returns: the tree of a document with no issue, or every issue found. */
export type SafeParseTreeResult<TRegistration extends TreeRegistration = BaseRegistration> =
	{ success: true; tree: ParsedNode<TRegistration> } | { success: false; issues: StandardSchemaIssue[] };

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function valueAt(node: Record<PropertyKey, unknown>, keys: readonly string[]): unknown {
	let current: unknown = node;
	for (const key of keys) {
		if (!isRecord(current)) return undefined;
		current = current[key];
	}
	return current;
}

/**
 * Check a whole document, node by node, without throwing.
 *
 * @param registry - Where each node's `$type` finds its registration
 * @param root - The document's root node, as it arrived
 * @param path - Where the root sits in a larger document; every issue's `path` starts with it
 *
 * @remarks
 * Each node goes through {@link safeParseNode} with its full path, so the issues are those of one node, at the
 * position the document has them. A registration says where its children are with `childPaths`: each path is read
 * from the node as authored, a missing value is no children, an array is walked item by item and an object is one
 * child. Any other value at a child path is an issue at that path (`Expected a node or a list of nodes.`), and so is a
 * node that contains itself. A node whose own schema fails is not walked further, but its siblings still are, so one
 * call reports every issue of the document. The tree is returned only when there are none.
 *
 * One lookup serves the whole tree; which `$type`s a position accepts is the parent's schema to say.
 *
 * @throws {Error} When a registration's schema validates asynchronously, as {@link safeParseNode} does.
 */
export function safeParseTree<TRegistration extends TreeRegistration>(
	registry: NodeLookup<TRegistration>,
	root: unknown,
	path: NonNullable<StandardSchemaIssue['path']> = [],
): SafeParseTreeResult<TRegistration> {
	const issues: StandardSchemaIssue[] = [];

	function walk(
		node: unknown,
		nodePath: NonNullable<StandardSchemaIssue['path']>,
		ancestors: readonly unknown[],
	): ParsedNode<TRegistration> | undefined {
		if (ancestors.includes(node)) {
			issues.push({ message: 'A node cannot contain itself.', path: nodePath });
			return undefined;
		}
		const parsed = safeParseNode(registry, node, nodePath);
		if (!parsed.success) {
			issues.push(...parsed.issues);
			return undefined;
		}
		const children: Record<string, ParsedNode<TRegistration> | ParsedNode<TRegistration>[]> = {};
		if (isRecord(node)) {
			for (const keys of parsed.registration.childPaths ?? []) {
				const value = valueAt(node, keys);
				const childPath = [...nodePath, ...keys];
				const trail = [...ancestors, node];
				if (Array.isArray(value)) {
					const items = value.map((item, index) => walk(item, [...childPath, index], trail));
					children[keys.join('.')] = items.filter((item) => item !== undefined);
				} else if (isRecord(value)) {
					const child = walk(value, childPath, trail);
					if (child) children[keys.join('.')] = child;
				} else if (value !== undefined) {
					issues.push({ message: 'Expected a node or a list of nodes.', path: childPath });
				}
			}
		}
		return {
			$type: parsed.$type,
			registration: parsed.registration,
			data: parsed.data,
			path: nodePath,
			children,
		} as ParsedNode<TRegistration>;
	}

	const tree = walk(root, path, []);
	return tree && issues.length === 0 ? { success: true, tree } : { success: false, issues };
}
