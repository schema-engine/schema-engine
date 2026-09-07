import type { StandardSchemaV1 } from '@standard-schema/spec';

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
