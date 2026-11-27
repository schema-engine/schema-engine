/**
 * Why building or binding a registry failed. Each code names one mistake in the registrations or bindings.
 *
 * @remarks
 * The codes are the contract: depend on a code, not on the wording of `message`, which may change. A code is only
 * added, never renamed or reused for another mistake.
 *
 * - `'invalid-schema'`: a registration's `schema` has no `~standard.validate` function. Thrown by
 *   {@link createRegistry} (with `kind` and `$type`), by {@link bindRegistry} through it, and by
 *   {@link assertStandardSchema} (with neither).
 * - `'invalid-child-paths'`: a registration's `childPaths` is not a list, or holds an entry that is not a non-empty
 *   list of non-empty string keys.
 * - `'duplicate-child-path'`: a registration declares the same child path twice, once the keys are joined with dots.
 * - `'nested-child-path'`: a child path runs through another child path of the same registration.
 * - `'duplicate-type'`: a `$type` is registered twice while `duplicates` is `'error'`.
 * - `'unknown-binding'`: {@link bindRegistry} got a binding whose key is no contract's `$type`.
 * - `'missing-binding'`: {@link bindRegistry} got no binding for a contract.
 * - `'binding-overrides-contract'`: a binding sets a key its contract already defines.
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

/** What a {@link RegistryError} says about where it happened. */
export interface RegistryErrorDetails {
	/** The registry's label, for example `Widget`. */
	readonly kind?: string;
	/** The `$type` of the registration or binding at fault. */
	readonly $type?: string;
}

/**
 * Thrown while a registry is built ({@link createRegistry}) or bound ({@link bindRegistry}) from registrations that
 * break a rule.
 *
 * @remarks
 * Branch on `code`, not on `message`: the message is written for a person and may be reworded, while the codes of
 * {@link RegistryErrorCode} stay. `kind` and `$type` are set when the throw site knows them, so a tool can point at
 * the registration without parsing the message. Errors raised while parsing a node or a document (an asynchronous
 * Standard Schema, say) are not `RegistryError`s.
 */
export class RegistryError extends Error {
	readonly code: RegistryErrorCode;
	readonly kind?: string;
	readonly $type?: string;

	constructor(code: RegistryErrorCode, message: string, details: RegistryErrorDetails = {}) {
		super(message);
		this.name = 'RegistryError';
		this.code = code;
		if (details.kind !== undefined) this.kind = details.kind;
		if (details.$type !== undefined) this.$type = details.$type;
	}
}
