/**
 * Why building or binding a registry failed. Each code names one mistake in the registrations or bindings.
 *
 * @remarks
 * The codes are the contract: depend on a code, not on the wording of `message`, which may change. A code is only
 * added, never renamed or reused for another mistake.
 *
 * - `'invalid-schema'`: a registration's `schema` has no `~standard.validate` function.
 * - `'invalid-child-paths'`: a registration's `childPaths` is not a list, or holds an entry that is not a non-empty
 *   list of non-empty string keys.
 * - `'duplicate-child-path'`: a registration declares the same child path (`childPath`) twice, once the keys are
 *   joined with dots.
 * - `'nested-child-path'`: a child path (`childPath`) runs through another child path (`outerChildPath`) of the same
 *   registration.
 * - `'duplicate-type'`: a `$type` is registered twice while `duplicates` is `'error'`.
 * - `'unknown-binding'`: {@link bindRegistry} got a binding whose key (`$type`) is no contract's `$type`.
 * - `'missing-binding'`: {@link bindRegistry} got no binding for a contract.
 * - `'binding-overrides-contract'`: a binding sets a key (`key`) its contract already defines.
 */
export type RegistryErrorCode =
	| 'invalid-schema'
	| 'invalid-child-paths'
	| 'duplicate-child-path'
	| 'nested-child-path'
	| 'duplicate-type'
	| 'unknown-binding'
	| 'missing-binding'
	| 'binding-overrides-contract';

/** Where a {@link RegistryError} happened, and what its code needs to be described without the message. */
export interface RegistryErrorDetails {
	/** The registry's label, for example `Widget`. */
	readonly kind: string;
	/** The `$type` of the registration at fault, or the key of a binding that names no registration. */
	readonly $type: string;
	/** The key a binding sets that its contract defines, for `'binding-overrides-contract'`. */
	readonly key?: string;
	/** The keys of the child path at fault, for `'duplicate-child-path'` and `'nested-child-path'`. */
	readonly childPath?: readonly string[];
	/** The keys of the child path that `childPath` runs through, for `'nested-child-path'`. */
	readonly outerChildPath?: readonly string[];
}

/**
 * Thrown while a registry is built ({@link createRegistry}) or bound ({@link bindRegistry}) from registrations that
 * break a rule.
 *
 * @remarks
 * Branch on `code`, not on `message`: the message is written for a person and may be reworded, while the codes of
 * {@link RegistryErrorCode} stay. `code` with the details is enough to write the message again, in another language
 * say, without parsing it. Errors raised while parsing a node or a document (an asynchronous Standard Schema, say), and
 * by {@link assertStandardSchema} on its own, are not `RegistryError`s.
 */
export class RegistryError extends Error implements RegistryErrorDetails {
	readonly code: RegistryErrorCode;
	readonly kind: string;
	readonly $type: string;
	readonly key?: string;
	readonly childPath?: readonly string[];
	readonly outerChildPath?: readonly string[];

	constructor(code: RegistryErrorCode, message: string, details: RegistryErrorDetails) {
		super(message);
		this.name = 'RegistryError';
		this.code = code;
		this.kind = details.kind;
		this.$type = details.$type;
		if (details.key !== undefined) this.key = details.key;
		if (details.childPath !== undefined) this.childPath = details.childPath;
		if (details.outerChildPath !== undefined) this.outerChildPath = details.outerChildPath;
	}
}
