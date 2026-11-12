import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { AnyValidationRegistration } from '@/schemas/validation/types';
import type { AppearanceAxisList, SlotAppearanceAxes } from '@/lib/appearance';

/** Coerce inferred registration maps into the engine generic constraint. */
export type AsRegistrationMap<T> = T extends Record<string, unknown> ? T : Record<never, never>;

/**
 * Config input type from a registration schema, without `$type`.
 *
 * Form authors supply this shape: defaults stay optional, transforms apply
 * at `defineForm` / `validateForm` time.
 */
export type ExtractSchemaType<TSchema> = TSchema extends StandardSchemaV1
	? Omit<StandardSchemaV1.InferInput<TSchema>, '$type'>
	: Record<string, unknown>;

/**
 * Config output type from a registration schema.
 * Components receive this shape after defaults and transforms.
 */
export type ExtractSchemaOutput<TSchema> = TSchema extends StandardSchemaV1
	? StandardSchemaV1.InferOutput<TSchema>
	: unknown;

/**
 * Extract type identifier from a registration object.
 */
export type ExtractTypeId<T> = T extends { $type: infer K } ? K : never;

type ConfigMapFromRegistration<R, TOutput extends boolean = false> = R extends {
	$type: infer K extends string;
	schema: infer S;
}
	? S extends StandardSchemaV1
		? Record<K, TOutput extends true ? Omit<StandardSchemaV1.InferOutput<S>, '$type'> : ExtractSchemaType<S>>
		: Record<never, never>
	: Record<never, never>;

/**
 * Merge open arrays of registrations. Duplicate `$type` keys become a union of
 * configs because TypeScript cannot see registration order. Runtime is last-wins;
 * pass a tuple or an inline array for last-wins typing.
 */
type UnionMergeMaps<U> = {
	[K in U extends unknown ? keyof U : never]: U extends Record<K, infer V> ? V : never;
};

export type MergeRegistrationMaps<T extends readonly unknown[], TOutput extends boolean = false> = [T[number]] extends [
	never,
]
	? Record<never, never>
	: UnionMergeMaps<ConfigMapFromRegistration<T[number], TOutput>>;

/** Later keys in `Override` replace matching keys in `Base`. Empty override maps preserve `Base`. */
export type LastWinsMerge<Base extends Record<string, unknown>, Override extends Record<string, unknown>> = [
	keyof Override,
] extends [never]
	? Base
	: Omit<Base, keyof Override> & Override;

type IsFixedLengthTuple<T extends readonly unknown[]> = number extends T['length'] ? false : true;

type FoldRegistrationMapsLastWins<T extends readonly unknown[], TOutput extends boolean = false> = T extends readonly [
	infer Head,
	...infer Tail extends readonly unknown[],
]
	? LastWinsMerge<ConfigMapFromRegistration<Head, TOutput>, FoldRegistrationMapsLastWins<Tail, TOutput>>
	: Record<never, never>;

/**
 * Duplicate `$type` contract:
 * - Runtime always last-wins.
 * - Tuple / inline arrays: last-wins in the type.
 * - Open arrays (`T[]`): union of configs for the same `$type`.
 */
export type MergeRegistrationMapsLastWins<T extends readonly unknown[], TOutput extends boolean = false> = [
	T[number],
] extends [never]
	? Record<never, never>
	: IsFixedLengthTuple<T> extends true
		? FoldRegistrationMapsLastWins<T, TOutput>
		: MergeRegistrationMaps<T, TOutput>;

/** Engine element/recipe map for a registration list (see {@link MergeRegistrationMapsLastWins}). */
export type MergedRegistrationMap<T extends readonly unknown[]> = AsRegistrationMap<MergeRegistrationMapsLastWins<T>>;

/** Action registrations use the same last-wins merge as elements and recipes. */
export type MergedActionRegistrationMap<T extends readonly unknown[]> = MergedRegistrationMap<T>;

/** Structural Standard Schema check used to reject `{}` and primitives at the factory. */
export type StandardSchemaConstraint = {
	readonly '~standard': {
		readonly validate: (value: unknown) => unknown;
	};
};

export type ElementRegistrationConstraint = {
	readonly $type: string;
	readonly schema: StandardSchemaConstraint;
	readonly metadata: { readonly name: string };
	readonly render: (props: never) => unknown;
	readonly validations?: readonly AnyValidationRegistration[];
	readonly containerKind?: import('@/types/registration').ContainerKind;
	readonly appearanceAxes?: AppearanceAxisList;
};

export type RecipeRegistrationConstraint = {
	readonly $type: string;
	readonly schema: StandardSchemaConstraint;
	readonly kind: 'single-step' | 'wizard';
	readonly slots: readonly string[];
	readonly appearanceAxes?: SlotAppearanceAxes;
	readonly metadata: { readonly name: string };
	readonly render: unknown;
};

export type ActionRegistrationConstraint = {
	readonly $type: string;
	readonly schema: StandardSchemaConstraint;
	readonly metadata: { readonly name: string };
	readonly execute: (...args: never[]) => unknown;
};

/** Parsed config maps retain defaults and transforms independently of authoring input. */
export interface EngineOutputMaps {
	elements: Record<string, unknown>;
	recipes: Record<string, unknown>;
	actions: Record<string, unknown>;
}

export type MergedOutputMap<T extends readonly unknown[]> = AsRegistrationMap<MergeRegistrationMapsLastWins<T, true>>;
