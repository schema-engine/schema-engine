import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { BuilderActionRegistration } from '@/types';

/**
 * Config input type from a registration schema, without `$type`.
 *
 * Any Standard Schema implementation (Zod, Valibot, Effect Schema, or a
 * hand-written `~standard` object) exposes `InferInput`. That is the authoring
 * shape: defaults stay optional, transforms apply at `defineForm` time.
 */
export type ExtractSchemaType<TSchema> = TSchema extends StandardSchemaV1
	? Omit<StandardSchemaV1.InferInput<TSchema>, '$type'>
	: Record<string, unknown>;

/**
 * Extract type identifier from a registration object.
 */
export type ExtractTypeId<T> = T extends { $type: infer K } ? K : never;

type ConfigMapFromRegistration<R> = R extends { $type: infer K extends string; schema: infer S }
	? S extends StandardSchemaV1
		? Record<K, ExtractSchemaType<S>>
		: Record<never, never>
	: Record<never, never>;

export type MergeRegistrationMaps<T extends readonly unknown[]> = T extends readonly [
	infer Head,
	...infer Rest extends readonly unknown[],
]
	? ConfigMapFromRegistration<Head> & MergeRegistrationMaps<Rest>
	: Record<never, never>;

type ActionMapFromRegistration<R> =
	R extends BuilderActionRegistration<infer TType extends string, infer TConfig>
		? Record<TType, TConfig>
		: R extends { $type: infer TType extends string; schema: infer S }
			? S extends StandardSchemaV1
				? Record<TType, ExtractSchemaType<S>>
				: Record<never, never>
			: Record<never, never>;

export type MergeActionRegistrationMaps<T extends readonly unknown[]> = T extends readonly [
	infer Head,
	...infer Rest extends readonly unknown[],
]
	? ActionMapFromRegistration<Head> & MergeActionRegistrationMaps<Rest>
	: Record<never, never>;
