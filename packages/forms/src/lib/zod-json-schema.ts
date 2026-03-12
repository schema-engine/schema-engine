import { z } from 'zod';
import type { JSONSchemaObject, JSONSchemaTarget } from '@/lib/standard-json-schema';

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
	},
): JSONSchemaObject {
	return z.toJSONSchema(metadataRegistry, {
		target: options?.target || 'draft-2020-12',
		uri: options?.uri || ((id: string) => `#/definitions/${id}`),
	}) as JSONSchemaObject;
}

/**
 * Generate a JSON Schema document from a Zod validator using registry metadata.
 * An optional `$id` can be applied centrally so higher layers do not repeat that
 * concern for each emitted schema.
 */
export function generateZodJSONSchemaDocument(
	validator: z.ZodTypeAny,
	metadataRegistry: ZodJSONSchemaRegistry,
	options?: {
		target?: JSONSchemaTarget;
		schemaId?: string;
	},
): JSONSchemaObject {
	const schema = z.toJSONSchema(validator, {
		target: options?.target || 'draft-2020-12',
		metadata: metadataRegistry as ReturnType<typeof z.registry<Record<string, any>>>,
	}) as JSONSchemaObject & { $id?: string };

	if (options?.schemaId) {
		schema.$id = options.schemaId;
	}

	return schema;
}
