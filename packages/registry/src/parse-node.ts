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
	 * The registry's label, for example `Widget`. A registry built by `createRegistry` has it.
	 *
	 * @remarks
	 * {@link safeParseTree} names it in the `RegistryError` it throws when a schema contradicts its registration, and
	 * leaves it out for a lookup that has none, such as a function that tries several registries.
	 */
	readonly kind?: string;
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
	| { success: false; issues: RegistryIssue[] };

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

/**
 * An issue of a node or a document, as {@link safeParseNode} and {@link safeParseTree} report it.
 *
 * @remarks
 * The issues the engine creates itself carry a namespaced `code`, so a consumer can branch on it and a schema library's
 * own `code`, which an issue from a schema keeps untouched, cannot be mistaken for one:
 *
 * - `'registry/not-an-object'`: the node is not an object.
 * - `'registry/missing-type'`: the node has no string `$type`.
 * - `'registry/unregistered-type'`: no registration answers the `$type` (`received`).
 * - `'registry/not-accepted'`: the `$type` (`received`) is not in the `accepts` list (`expected`) of its position.
 * - `'registry/not-a-node'`: a value at a child path is neither an object nor a list.
 * - `'registry/contains-itself'`: a node is reached again through its own ancestors.
 *
 * The messages are written for a person and may be reworded; the codes stay.
 */
export interface RegistryIssue extends StandardSchemaIssue {
	/** The namespaced code of an issue the engine created, or whatever the schema library put on its own issue. */
	readonly code?: string;
	/**
	 * What would have fitted, for `'registry/not-accepted'`: the `accepts` list.
	 *
	 * @remarks
	 * Set only on an issue the engine created. An issue from a schema keeps its library's own fields untouched, and some
	 * libraries have an `expected` or `received` of their own, so check `code` first.
	 */
	readonly expected?: readonly string[];
	/** What was there, for `'registry/not-accepted'` and `'registry/unregistered-type'`: the `$type`. */
	readonly received?: string;
}

/**
 * What a call of {@link safeParseNode} or {@link safeParseTree} may be told besides the node.
 *
 * @remarks
 * For {@link safeParseTree}, `TType` is the `$type`s of the lookup, so a name it lacks is a type error and a literal
 * `accepts` narrows the root.
 */
export interface ParseOptions<TType extends string = string> {
	/** Where the node sits in its document. Every issue's `path` starts with it. */
	readonly path?: NonNullable<StandardSchemaIssue['path']>;
	/**
	 * The `$type`s the node may have, as a position of a document accepts them. Not empty when present, or the call
	 * throws: an empty list is a caller bug, like an asynchronous schema.
	 */
	readonly accepts?: readonly TType[];
}

function notAcceptedMessage(type: string, accepts: readonly string[]): string {
	const names = accepts.map((name) => `'${name}'`);
	const expected = names.length === 1 ? names[0] : `one of ${names.join(', ')}`;
	return `$type '${type}' is not accepted here. Expected ${expected}.`;
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check one node against the registration its `$type` names, without throwing.
 *
 * @param registry - Where the node's `$type` finds its registration
 * @param node - The node as it arrived, for example one entry of a parsed JSON document
 * @param options - Where the node sits (`path`) and which `$type`s it may have (`accepts`), see {@link ParseOptions}
 *
 * @remarks
 * An issue points at the value that is wrong, as a schema reports it, so an editor can mark that value and a YAML
 * mapper finds its line: a node that is not an object is an issue at `path`; an object without a string `$type`, a
 * `$type` outside `accepts` and a `$type` no registration answers are issues at `[...path, '$type']`, where a schema
 * reports a missing required key. `accepts` is checked before the lookup, so a `$type` outside the list is not
 * accepted whether or not it is registered, and the issue names what would fit. The lookup's `hint` adds to the message
 * of an unregistered `$type` only.
 * Otherwise the issues are those of the registration's schema, with `path` in front of the path the schema reported.
 *
 * `data` is what the schema returned, so its defaults and transforms apply. Its type is the schema output of the
 * registration that `registration.$type` names, for a registry typed by registrations with literal `$type`s, and
 * `unknown` for one typed as `BaseRegistration`. TypeScript cannot follow the runtime lookup from the node's string
 * `$type` to a registration, so the function returns `data` through one cast to that type: it is the value the matched
 * registration's own schema returned. The node is checked on its own, whatever its `childPaths` say, and its schema
 * may omit `$type`: {@link safeParseTree} walks a tree with it and holds the schema to the registration's contract.
 *
 * @throws {Error} When the registration's schema validates asynchronously, as {@link safeParseStandardSchema} does,
 * and when `accepts` is an empty list.
 */
export function safeParseNode<TRegistration extends Pick<BaseRegistration, 'schema'>>(
	registry: NodeLookup<TRegistration>,
	node: unknown,
	options: ParseOptions = {},
): SafeParseNodeResult<TRegistration> {
	const { path = [], accepts } = options;
	if (accepts?.length === 0) throw new Error('accepts must name at least one $type.');
	if (!isRecord(node)) {
		return {
			success: false,
			issues: [{ code: 'registry/not-an-object', message: 'Expected an object with a string $type.', path }],
		};
	}
	const type = node.$type;
	if (typeof type !== 'string') {
		return {
			success: false,
			issues: [{ code: 'registry/missing-type', message: 'Expected a string $type.', path: [...path, '$type'] }],
		};
	}
	if (accepts && !accepts.includes(type)) {
		return {
			success: false,
			issues: [
				{
					code: 'registry/not-accepted',
					message: notAcceptedMessage(type, accepts),
					path: [...path, '$type'],
					expected: accepts,
					received: type,
				},
			],
		};
	}
	const registration = registry.get(type);
	if (!registration) {
		return {
			success: false,
			issues: [
				{
					code: 'registry/unregistered-type',
					message: unregisteredTypeMessage(type, registry.hint),
					path: [...path, '$type'],
					received: type,
				},
			],
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
