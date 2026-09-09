import * as z from 'zod/mini';
import type { JSONSchemaObject, JSONSchemaTarget } from '@/lib/standard-json-schema';

/**
 * Duck-type a Zod validator. Native Standard Schema objects only expose `~standard`.
 */
export function isZodType(schema: unknown): schema is z.ZodMiniType {
	return (
		typeof schema === 'object' &&
		schema !== null &&
		typeof (schema as { parse?: unknown }).parse === 'function' &&
		typeof (schema as { safeParse?: unknown }).safeParse === 'function'
	);
}

/**
 * Shared alias for the Zod registry type used during JSON Schema generation.
 * Keeping this in one place reduces the amount of Zod-specific typing that
 * leaks into higher-level schema artifact code.
 */
export type ZodJSONSchemaRegistry = ReturnType<typeof z.registry<Record<string, any>>>;

/**
 * Generate a JSON Schema collection from a Zod metadata registry.
 * This is the lowest-level adapter around `z.toJSONSchema(...)` for registry
 * collections and is intended to stay reusable if the artifact layer moves.
 */
export function generateZodJSONSchemaCollection(
	metadataRegistry: ZodJSONSchemaRegistry,
	options?: {
		target?: JSONSchemaTarget;
		uri?: (id: string) => string;
		io?: 'input' | 'output';
	},
): JSONSchemaObject {
	return z.toJSONSchema(metadataRegistry, {
		target: options?.target || 'draft-2020-12',
		io: options?.io || 'output',
		uri: options?.uri || ((id: string) => `#/definitions/${id}`),
	}) as JSONSchemaObject;
}

/**
 * Generate a JSON Schema document from a Zod validator using registry metadata.
 * An optional `$id` can be applied centrally so higher layers do not repeat that
 * concern for each emitted schema.
 */
export function generateZodJSONSchemaDocument(
	validator: z.ZodMiniType,
	metadataRegistry: ZodJSONSchemaRegistry,
	options?: {
		target?: JSONSchemaTarget;
		schemaId?: string;
		io?: 'input' | 'output';
	},
): JSONSchemaObject {
	const schema = z.toJSONSchema(validator, {
		target: options?.target || 'draft-2020-12',
		io: options?.io || 'output',
		metadata: metadataRegistry as ReturnType<typeof z.registry<Record<string, any>>>,
	}) as JSONSchemaObject & { $id?: string };

	if (options?.schemaId) {
		schema.$id = options.schemaId;
	}

	return schema;
}
