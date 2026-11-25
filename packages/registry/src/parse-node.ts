import { safeParseStandardSchema, type StandardSchemaIssue } from './standard-schema.js';
import type { BaseRegistration } from './types.js';

/** What {@link safeParseNode} needs of a registry: the registration of a `$type`. Both registry kinds fit. */
export interface NodeLookup<TRegistration extends BaseRegistration = BaseRegistration> {
	get(key: string): TRegistration | undefined;
}

/**
 * What {@link safeParseNode} returns: the registration with the node's validated configuration, or every issue found.
 *
 * @remarks
 * `issues` has the shape of the result of `parseActions` and of a YAML validator.
 */
export type SafeParseNodeResult<TRegistration extends BaseRegistration = BaseRegistration> =
	{ success: true; registration: TRegistration; data: unknown } | { success: false; issues: StandardSchemaIssue[] };

/**
 * Check one node against the registration its `$type` names, without throwing.
 *
 * @param registry - Where the node's `$type` finds its registration
 * @param node - The node as it arrived, for example one entry of a parsed JSON document
 * @param path - Where the node sits in its document. Every issue's `path` starts with it.
 *
 * @remarks
 * A node that is not an object with a string `$type` is an issue at `path`, and a `$type` no registration answers
 * is an issue at `$type` below it. Otherwise the issues are those of the registration's schema, with `path` in
 * front of the path the schema reported. `data` is what the schema returned, so its defaults and transforms apply.
 * It looks at the node only: walking a tree is the caller's, which passes each child its own `path`.
 *
 * @throws {Error} When the registration's schema validates asynchronously, as {@link safeParseStandardSchema} does.
 */
export function safeParseNode<TRegistration extends BaseRegistration>(
	registry: NodeLookup<TRegistration>,
	node: unknown,
	path: NonNullable<StandardSchemaIssue['path']> = [],
): SafeParseNodeResult<TRegistration> {
	const type = typeof node === 'object' && node !== null && '$type' in node ? node.$type : undefined;
	if (typeof type !== 'string') {
		return { success: false, issues: [{ message: 'A node is an object with a string $type.', path }] };
	}
	const registration = registry.get(type);
	if (!registration) {
		return {
			success: false,
			issues: [{ message: `No registration for $type '${type}'.`, path: [...path, '$type'] }],
		};
	}
	const parsed = safeParseStandardSchema(registration.schema, node);
	if (parsed.success) return { success: true, registration, data: parsed.data };
	return {
		success: false,
		issues: parsed.error.issues.map((issue) => ({ ...issue, path: [...path, ...(issue.path ?? [])] })),
	};
}
