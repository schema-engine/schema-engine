/**
 * `T` with every property, array and nested object read-only; functions are kept as they are.
 *
 * @remarks
 * Forms publishes it on the `./lib/normalized-form-config` subpath, because its public config types
 * are built from it and a consumer's declaration emit must be able to name it. It is a separate copy
 * from the one `@schema-engine/layout` keeps internal for its grid helpers, so neither package's root
 * entry exports it.
 */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
	? T
	: T extends ReadonlyArray<infer U>
		? ReadonlyArray<DeepReadonly<U>>
		: T extends object
			? { readonly [K in keyof T]: DeepReadonly<T[K]> }
			: T;
