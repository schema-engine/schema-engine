/**
 * Why building or binding a registry, or parsing a tree, failed. Each code names one mistake in the registrations or
 * bindings.
 *
 * @remarks
 * The codes are the contract: depend on a code, not on the wording of `message`, which may change. A code is only
 * added, never renamed or reused for another mistake.
 *
 * - `'invalid-schema'`: a registration's `schema` has no `~standard.validate` function.
 * - `'invalid-child-paths'`: a registration's `childPaths` is not a list, or holds an entry that is not an object
 *   `{ keys, accepts? }` with a non-empty list of non-empty string `keys`, no other property, and an `accepts` that is
 *   absent or a non-empty list of non-empty strings without repeats. `replaceChildSlot` throws it too for a path with
 *   no keys.
 * - `'duplicate-child-path'`: a registration declares the same child path (`childPath`) twice, key by key.
 * - `'nested-child-path'`: a child path (`childPath`) runs through another child path (`outerChildPath`) of the same
 *   registration.
 * - `'duplicate-type'`: a `$type` is registered twice while `duplicates` is `'error'`.
 * - `'unknown-binding'`: {@link bindRegistry} got a binding whose key (`$type`) is no contract's `$type`.
 * - `'missing-binding'`: {@link bindRegistry} got no binding for a contract.
 * - `'binding-overrides-contract'`: a binding sets a key (`key`) its contract already defines.
 * - `'schema-changes-type'`: {@link safeParseTree} parsed a node whose schema returned an output with another `$type`
 *   than the node's, or none.
 * - `'schema-breaks-child-path'`: {@link safeParseTree} parsed a node whose schema returned an output that does not
 *   keep a child path (`childPath`) the document fills, or fills one the document leaves empty.
 * - `'unreachable-child-path'`: {@link exportTreeSchema} found no slot for a child path (`childPath`) in the JSON
 *   Schema of a registration, because the schema does not declare its keys, or it sits behind `allOf`, a `$ref` or a
 *   union, or inside a schema with an `$id` of its own, or because the slot is nullable.
 * - `'unknown-accepted-type'`: {@link exportTreeSchema} was given a lookup that lacks a `$type` a child path
 *   (`childPath`) accepts (`key`).
 * - `'definition-name-clash'`: {@link exportTreeSchema} found that a definition a schema brought along (`key`) takes the
 *   name of a `$type` or of another definition.
 */
export type RegistryErrorCode =
	| 'invalid-schema'
	| 'invalid-child-paths'
	| 'duplicate-child-path'
	| 'nested-child-path'
	| 'duplicate-type'
	| 'unknown-binding'
	| 'missing-binding'
	| 'binding-overrides-contract'
	| 'schema-changes-type'
	| 'schema-breaks-child-path'
	| 'unreachable-child-path'
	| 'unknown-accepted-type'
	| 'definition-name-clash';

/** Where a {@link RegistryError} happened, and what its code needs to be described without the message. */
export interface RegistryErrorDetails {
	/**
	 * The registry's label, for example `Widget`.
	 *
	 * @remarks
	 * Absent when a parse failed through a lookup that is not a registry, a function say, which has no label.
	 */
	readonly kind?: string;
	/** The `$type` of the registration at fault, or the key of a binding that names no registration. */
	readonly $type: string;
	/**
	 * The key a binding sets that its contract defines, for `'binding-overrides-contract'`, the `$type` a child path
	 * accepts that the lookup lacks, for `'unknown-accepted-type'`, and the name of the definition that clashes, for
	 * `'definition-name-clash'`.
	 */
	readonly key?: string;
	/**
	 * The keys of the child path at fault, for `'duplicate-child-path'`, `'nested-child-path'` and
	 * `'schema-breaks-child-path'`, `'unreachable-child-path'` and `'unknown-accepted-type'`.
	 */
	readonly childPath?: readonly string[];
	/** The keys of the child path that `childPath` runs through, for `'nested-child-path'`. */
	readonly outerChildPath?: readonly string[];
}

/**
 * Thrown while a registry is built ({@link createRegistry}) or bound ({@link bindRegistry}) from registrations that
 * break a rule, and while a tree is parsed ({@link safeParseTree}) when a schema contradicts its registration.
 *
 * @remarks
 * Branch on `code`, not on `message`: the message is written for a person and may be reworded, while the codes of
 * {@link RegistryErrorCode} stay. `code` with the details is enough to write the message again, in another language
 * say, without parsing it. A parse throws a `RegistryError` only when a schema contradicts its registration, which is
 * a bug of the registration and no issue of the document. Other errors raised while parsing a node or a document (an
 * asynchronous Standard Schema, say), and by {@link assertStandardSchema} on its own, are not `RegistryError`s.
 */
export class RegistryError extends Error implements RegistryErrorDetails {
	readonly code: RegistryErrorCode;
	readonly kind?: string;
	readonly $type: string;
	readonly key?: string;
	readonly childPath?: readonly string[];
	readonly outerChildPath?: readonly string[];

	constructor(code: RegistryErrorCode, message: string, details: RegistryErrorDetails) {
		super(message);
		this.name = 'RegistryError';
		this.code = code;
		if (details.kind !== undefined) this.kind = details.kind;
		this.$type = details.$type;
		if (details.key !== undefined) this.key = details.key;
		if (details.childPath !== undefined) this.childPath = details.childPath;
		if (details.outerChildPath !== undefined) this.outerChildPath = details.outerChildPath;
	}
}
