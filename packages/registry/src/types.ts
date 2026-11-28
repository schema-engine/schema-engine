import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Universal metadata for all registrations.
 */
export interface RegistrationMetadata {
	/** Human-readable display name */
	name: string;
	/** Detailed description of the component's purpose */
	description?: string;
}

/**
 * Universal metadata for visual components.
 */
export interface ComponentMetadata extends RegistrationMetadata {
	/** Icon identifier for UI display */
	icon?: string;
	/** Tags for filtering and searching */
	tags?: string[];
	/** Version of the component */
	version?: string;
}

/** Brand symbol for compile-time type discrimination (erased at runtime) */
declare const __brand: unique symbol;

/**
 * Phantom type brand - adds compile-time type identity without runtime cost.
 */
export type Brand<T, TBrand> = T & { readonly [__brand]?: TBrand };

/**
 * One place where a node holds child nodes, as a registration declares it in `childPaths`.
 *
 * @remarks
 * Plain data, so a registration stays serializable. `keys` is relative to the node and holds no indexes, which is why
 * it is not called `path`: a `path` in this package is an absolute document path with indexes. The value there is one
 * node or an array of nodes. `accepts` is a closed list of `$type`s, the only way to restrict a slot: it reads no
 * role, tag or category, and `metadata` decides nothing. Adding a leaf to `[...defaults, custom]` means overriding each
 * container that should take it. Without `accepts`, the slot puts no limit on the `$type`, so any `$type` the lookup
 * answers is accepted. The parent's schema keeps the slot opaque (`z.array(z.unknown())`, `z.unknown()`). A tool that
 * reads child paths does not decide what a slot takes: it checks a document with `safeParseTree`, or validates it
 * against the JSON Schema that `exportTreeSchema` writes.
 */
export interface ChildPath {
	/** The keys from the node to the slot, for example `['engine', 'controls']` for `node.engine.controls`. */
	readonly keys: readonly string[];
	/** The `$type`s allowed at the slot, at least one when present. Absent: `accepts` puts no limit on the `$type`. */
	readonly accepts?: readonly string[];
}

/**
 * Base registration interface - common fields for all registration types.
 *
 * `schema` is the concrete Standard Schema value. Do not collapse it to
 * `StandardSchemaV1<TConfig>`: that forces input and output to the same type
 * and makes defaulted properties required at authoring time.
 */
export interface BaseRegistration<_TConfig = unknown, TMeta extends RegistrationMetadata = ComponentMetadata> {
	/** Unique identifier - MUST be unique within its registry type. */
	$type: string;
	/** Standard Schema for config validation. Input and output remain distinct. */
	schema: StandardSchemaV1;
	/** Registration metadata (display name, description, and type-specific fields) */
	metadata: TMeta;
	/**
	 * Where a node of this `$type` holds child nodes, and which `$type`s each place accepts.
	 *
	 * @remarks
	 * `[{ keys: ['blocks'], accepts: ['block'] }, { keys: ['engine', 'controls'] }]` says a node has children at
	 * `node.blocks` and at `node.engine.controls`. A path is read from the node as authored, so the issues
	 * {@link safeParseTree} reports point at the document. A missing value is no children, and the schema decides
	 * whether it may be missing. An array holds nodes only; what is not a node is reached by its keys, which is why a
	 * path is a list of keys. `createRegistry` checks each path when it builds the registry, and at the type level that
	 * the schema declares every key of it.
	 */
	readonly childPaths?: readonly ChildPath[];
}

/**
 * Component registration interface.
 * Foundation for all component registrations.
 */
export interface ComponentRegistration<
	TType extends string = string,
	TConfig = unknown,
	TProps = unknown,
	TMeta extends ComponentMetadata = ComponentMetadata,
> extends BaseRegistration<TConfig, TMeta> {
	/** Framework-agnostic render function */
	render: (props: TProps) => unknown;
	/** Type identifier - enforced to match registry key */
	$type: TType;
}
