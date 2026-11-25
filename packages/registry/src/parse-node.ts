import { safeParseStandardSchema, type StandardSchemaIssue } from './standard-schema.js';
import type { BaseRegistration } from './types.js';

/**
 * What {@link safeParseNode} needs of a registry: the registration of a `$type`, of which it reads the schema.
 * Both registry kinds fit.
 */
export interface NodeLookup<TRegistration extends Pick<BaseRegistration, 'schema'> = BaseRegistration> {
	get(key: string): TRegistration | undefined;
	/**
	 * A sentence that follows the message of a `$type` `get` does not answer, such as where to register it.
	 *
	 * @remarks
	 * It is a function of the type so a message can name what is registered. It runs only for an unregistered
	 * `$type`: the message is `No registration for $type 'x'. ` and what it returns.
	 */
	hint?(type: string): string;
}

/** What {@link safeParseNode} returns: the registration with the node's validated configuration, or every issue found. */
export type SafeParseNodeResult<TRegistration extends Pick<BaseRegistration, 'schema'> = BaseRegistration> =
	{ success: true; registration: TRegistration; data: unknown } | { success: false; issues: StandardSchemaIssue[] };

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check one node against the registration its `$type` names, without throwing.
 *
 * @param registry - Where the node's `$type` finds its registration
 * @param node - The node as it arrived, for example one entry of a parsed JSON document
 * @param path - Where the node sits in its document. Every issue's `path` starts with it.
 *
 * @remarks
 * An issue points at the value that is wrong, as a schema reports it, so an editor can mark that value and a YAML
 * mapper finds its line: a node that is not an object is an issue at `path`; an object without a string `$type`, and
 * a `$type` no registration answers, are issues at `[...path, '$type']`, where a schema reports a missing required key.
 * The lookup's `hint` adds to the message of the last.
 * Otherwise the issues are those of the registration's schema, with `path` in front of the path the schema reported.
 *
 * `data` is what the schema returned, so its defaults and transforms apply. It is `unknown` because the registration
 * is found by a string at runtime. The node is checked on its own: walking a tree is the caller's, which passes each
 * child its own `path`.
 *
 * @throws {Error} When the registration's schema validates asynchronously, as {@link safeParseStandardSchema} does.
 */
export function safeParseNode<TRegistration extends Pick<BaseRegistration, 'schema'>>(
	registry: NodeLookup<TRegistration>,
	node: unknown,
	path: NonNullable<StandardSchemaIssue['path']> = [],
): SafeParseNodeResult<TRegistration> {
	if (!isRecord(node)) {
		return { success: false, issues: [{ message: 'Expected an object with a string $type.', path }] };
	}
	const type = node.$type;
	if (typeof type !== 'string') {
		return { success: false, issues: [{ message: 'Expected a string $type.', path: [...path, '$type'] }] };
	}
	const registration = registry.get(type);
	if (!registration) {
		const message = `No registration for $type '${type}'.`;
		return {
			success: false,
			issues: [
				{ message: registry.hint ? `${message} ${registry.hint(type)}` : message, path: [...path, '$type'] },
			],
		};
	}
	const parsed = safeParseStandardSchema(registration.schema, node);
	if (parsed.success) return { success: true, registration, data: parsed.data };
	return {
		success: false,
		issues: parsed.error.issues.map((issue) => ({ ...issue, path: [...path, ...(issue.path ?? [])] })),
	};
}
