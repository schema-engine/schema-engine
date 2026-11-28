import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ValidationRegistrationConstraint } from '@/schemas/validation/types.js';
import type { AppearanceAxisList, SlotAppearanceAxes } from '@schema-engine/layout';
import type { ContainerKind } from '@/types/registration.js';
import type { ChildPath } from '@schema-engine/registry';

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

/**
 * What a registration contributes to a map of the engine: its config as authors write it (`input`), its parsed
 * config (`output`), or what its control writes (`value`).
 */
export type RegistrationMapMode = 'input' | 'output' | 'value';

/**
 * What a registration says about the value of the elements it types, for the values type of a form.
 *
 * @remarks
 * An input that holds its own value is `{ value }`, the output type of its declared schema. A container (it declares
 * `childPaths`) is `{ container }`, which tells whether its children make an object (the default) or a list of rows
 * by its `containerKind`. A static
 * element has neither, so it is no key of the map and contributes no value.
 */
export type ValueEntry =
	| { readonly value: unknown; readonly container?: undefined }
	| { readonly container: ContainerKind; readonly value?: undefined };

type ValueEntryOf<R> = 'value' extends keyof R
	? [NonNullable<R[keyof R & 'childPaths']>] extends [never]
		? NonNullable<R[keyof R & 'value']> extends (config: never) => infer V
			? [V] extends [StandardSchemaV1]
				? { readonly value: StandardSchemaV1.InferOutput<V> }
				: never
			: never
		: [NonNullable<R[keyof R & 'containerKind']>] extends [never]
			? { readonly container: 'object' }
			: { readonly container: NonNullable<R[keyof R & 'containerKind']> }
	: never;

type ConfigMapFromRegistration<R, TMode extends RegistrationMapMode = 'input'> = R extends {
	$type: infer K extends string;
	schema: infer S;
}
	? TMode extends 'value'
		? [ValueEntryOf<R>] extends [never]
			? Record<never, never>
			: Record<K, ValueEntryOf<R>>
		: S extends StandardSchemaV1
			? Record<K, TMode extends 'output' ? Omit<StandardSchemaV1.InferOutput<S>, '$type'> : ExtractSchemaType<S>>
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

export type MergeRegistrationMaps<T extends readonly unknown[], TMode extends RegistrationMapMode = 'input'> = [
	T[number],
] extends [never]
	? Record<never, never>
	: UnionMergeMaps<ConfigMapFromRegistration<T[number], TMode>>;

/** Later keys in `Override` replace matching keys in `Base`. Empty override maps preserve `Base`. */
export type LastWinsMerge<Base extends Record<string, unknown>, Override extends Record<string, unknown>> = [
	keyof Override,
] extends [never]
	? Base
	: Omit<Base, keyof Override> & Override;

type IsFixedLengthTuple<T extends readonly unknown[]> = number extends T['length'] ? false : true;

type FoldRegistrationMapsLastWins<
	T extends readonly unknown[],
	TMode extends RegistrationMapMode = 'input',
> = T extends readonly [infer Head, ...infer Tail extends readonly unknown[]]
	? LastWinsMerge<ConfigMapFromRegistration<Head, TMode>, FoldRegistrationMapsLastWins<Tail, TMode>>
	: Record<never, never>;

/**
 * Duplicate `$type` contract:
 * - Runtime always last-wins.
 * - Tuple / inline arrays: last-wins in the type.
 * - Open arrays (`T[]`): union of configs for the same `$type`.
 */
export type MergeRegistrationMapsLastWins<T extends readonly unknown[], TMode extends RegistrationMapMode = 'input'> = [
	T[number],
] extends [never]
	? Record<never, never>
	: IsFixedLengthTuple<T> extends true
		? FoldRegistrationMapsLastWins<T, TMode>
		: MergeRegistrationMaps<T, TMode>;

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
	/** Set by `defineInput` or `defineStatic`; a registration written by hand states it. */
	readonly kind: 'input' | 'static';
	readonly schema: StandardSchemaConstraint;
	readonly metadata: { readonly name: string; readonly category?: string };
	readonly render: (props: never) => unknown;
	readonly validations?: readonly ValidationRegistrationConstraint[];
	readonly containerKind?: ContainerKind;
	readonly childPaths?: readonly ChildPath[];
	readonly appearanceAxes?: AppearanceAxisList;
	readonly value?: (config: never) => StandardSchemaConstraint;
};

export type RecipeRegistrationConstraint = {
	readonly $type: string;
	readonly schema: StandardSchemaConstraint;
	readonly kind: 'single-step' | 'wizard';
	readonly slots: readonly string[];
	readonly appearanceAxes?: SlotAppearanceAxes;
	readonly slotSchemas?: Readonly<Partial<Record<string, StandardSchemaConstraint>>>;
	readonly metadata: { readonly name: string };
	readonly render: unknown;
};

export type ActionRegistrationConstraint = {
	readonly $type: string;
	readonly schema: StandardSchemaConstraint;
	readonly metadata: { readonly name: string };
	readonly execute: (...args: never[]) => unknown;
};

export type { ValidationRegistrationConstraint };

/** Parsed config maps retain defaults and transforms independently of authoring input. */
export interface EngineOutputMaps {
	elements: Record<string, unknown>;
	recipes: Record<string, unknown>;
	actions: Record<string, unknown>;
	/** What each element `$type` says about its value, a {@link ValueEntry}; read to type the values of a form. */
	values: Record<string, unknown>;
}

export type MergedOutputMap<T extends readonly unknown[]> = AsRegistrationMap<
	MergeRegistrationMapsLastWins<T, 'output'>
>;

/** The value entry of each element `$type` of a registration list, last registration winning. */
export type MergedValueMap<T extends readonly unknown[]> = AsRegistrationMap<MergeRegistrationMapsLastWins<T, 'value'>>;
