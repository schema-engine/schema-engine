/**
 * `T` with every property, array and nested object read-only; functions are kept as they are.
 *
 * @remarks
 * The root entry of `@schema-engine/forms` exports it, because its public config types are built from it and a
 * consumer's declaration emit must be able to name it. It is a separate copy from the one `@schema-engine/layout`
 * keeps internal for its grid helpers, which the root entry of layout does not export.
 */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
	? T
	: T extends ReadonlyArray<infer U>
		? ReadonlyArray<DeepReadonly<U>>
		: T extends object
			? { readonly [K in keyof T]: DeepReadonly<T[K]> }
			: T;
