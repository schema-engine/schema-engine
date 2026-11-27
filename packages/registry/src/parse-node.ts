import type { StandardSchemaV1 } from '@standard-schema/spec';
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
	 * The message is `No registration for $type 'x'.`, a space and the hint.
	 */
	hint?: string;
}

/**
 * What {@link safeParseNode} returns: the registration with the node's validated configuration, or every issue found.
 *
 * @remarks
 * The success branch has one member per registration of a typed registry, so checking `$type` (the node's, repeated at
 * the top of the result because TypeScript narrows a union only by a property of the union itself) narrows
 * `registration` and `data` together. A registration that does not declare its `$type`, such as a lookup typed by
 * `{ schema }` alone, leaves it a `string`. A registry typed as plain `BaseRegistration` has no concrete schema to
 * read, so its `data` is `unknown`.
 */
export type SafeParseNodeResult<TRegistration extends Pick<BaseRegistration, 'schema'> = BaseRegistration> =
	| (TRegistration extends unknown
			? {
					success: true;
					$type: TRegistration extends { $type: infer TType extends string } ? TType : string;
					registration: TRegistration;
					data: StandardSchemaV1.InferOutput<TRegistration['schema']>;
				}
			: never)
	| { success: false; issues: StandardSchemaIssue[] };

/**
 * The message for a `$type` no registration answers, as {@link safeParseNode} reports it.
 *
 * @param type - The `$type` that found nothing
 * @param hint - A sentence that follows the message, as {@link NodeLookup.hint} gives it
 *
 * @remarks
 * Exported so a caller that has to throw for the same case, instead of returning an issue, says the same thing.
 */
export function unregisteredTypeMessage(type: string, hint?: string): string {
	const message = `No registration for $type '${type}'.`;
	return hint ? `${message} ${hint}` : message;
}

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
 * `data` is what the schema returned, so its defaults and transforms apply. Its type is the schema output of the
 * registration that `registration.$type` names, for a registry typed by registrations with literal `$type`s, and
 * `unknown` for one typed as `BaseRegistration`. TypeScript cannot follow the runtime lookup from the node's string
 * `$type` to a registration, so the function returns `data` through one cast to that type: it is the value the matched
 * registration's own schema returned. The node is checked on its own: {@link safeParseTree} walks a tree with it,
 * passing each child its own `path`.
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
		return {
			success: false,
			issues: [{ message: unregisteredTypeMessage(type, registry.hint), path: [...path, '$type'] }],
		};
	}
	const parsed = safeParseStandardSchema(registration.schema, node);
	if (parsed.success) {
		return {
			success: true,
			$type: type,
			registration,
			data: parsed.data,
		} as SafeParseNodeResult<TRegistration>;
	}
	return {
		success: false,
		issues: parsed.error.issues.map((issue) => ({ ...issue, path: [...path, ...(issue.path ?? [])] })),
	};
}
