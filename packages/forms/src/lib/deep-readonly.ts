/**
 * `T` with every property, array and nested object read-only; functions are kept as they are.
 *
 * @remarks
 * Kept here rather than imported from `@schema-engine/layout`, which keeps its own copy for the
 * grid helpers and does not export it: it is plumbing, not part of either public surface.
 */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
	? T
	: T extends ReadonlyArray<infer U>
		? ReadonlyArray<DeepReadonly<U>>
		: T extends object
			? { readonly [K in keyof T]: DeepReadonly<T[K]> }
			: T;
