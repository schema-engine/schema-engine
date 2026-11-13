/**
 * `T` with every property, array and nested object read-only; functions are kept as they are.
 *
 * @remarks
 * Domain-free on purpose, so modules that must not depend on a domain's config (the
 * grid helpers) can accept frozen input.
 */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
	? T
	: T extends ReadonlyArray<infer U>
		? ReadonlyArray<DeepReadonly<U>>
		: T extends object
			? { readonly [K in keyof T]: DeepReadonly<T[K]> }
			: T;
