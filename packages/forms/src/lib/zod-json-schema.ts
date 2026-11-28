import * as z from 'zod/mini';
import type { JSONSchemaTarget } from '@schema-engine/registry';
import type { JSONSchemaObject } from '@/lib/standard-json-schema';
import { createExportConversion } from '@/lib/export-schema';

/**
 * Shared alias for the Zod registry type used during JSON Schema generation.
 * Keeping this in one place reduces the amount of Zod-specific typing that
 * leaks into higher-level schema artifact code.
 * @remarks Zod accepts heterogeneous metadata through this existential registry.
 */
export type ZodJSONSchemaRegistry = ReturnType<typeof z.registry<Record<string, any>>>;

/** How a collection refers to an entry when the caller gives no `uri`. */
export const defaultCollectionURI = (id: string): string => `#/definitions/${id}`;

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
	const target = options?.target ?? 'draft-2020-12';
	const io = options?.io || 'input';
	const uri = options?.uri ?? defaultCollectionURI;
	const conversion = createExportConversion({
		io,
		target,
		placement: { kind: 'collection', uri, registry: metadataRegistry },
	});
	return conversion.finish(
		z.toJSONSchema(metadataRegistry, {
			target,
			io,
			uri,
			override: conversion.override,
		}) as JSONSchemaObject,
	);
}

/**
 * Registry that answers metadata lookups from a primary registry laid over `z.globalRegistry`.
 *
 * @remarks
 * `z.toJSONSchema` reads metadata from the single registry passed as `metadata`, which replaces
 * `z.globalRegistry`. That is where `.describe(...)` and `.meta(...)` store a schema's own
 * description, so passing only the catalog registry dropped every author-written description.
 * Entries of the primary registry win key by key, except that an undefined value (a catalog entry
 * without a description) does not hide the one the schema declares.
 */
class LayeredMetadataRegistry extends z.core.$ZodRegistry<Record<string, unknown>> {
	constructor(private readonly primary: ZodJSONSchemaRegistry) {
		super();
	}

	override get(schema: z.core.$ZodType): Record<string, unknown> | undefined {
		const own = z.globalRegistry.get(schema);
		const layered = this.primary.get(schema);
		if (!layered) {
			return own;
		}
		const defined = Object.fromEntries(Object.entries(layered).filter(([, value]) => value !== undefined));
		return { ...own, ...defined };
	}
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
	const target = options?.target ?? 'draft-2020-12';
	const io = options?.io || 'input';
	const conversion = createExportConversion({
		io,
		target,
		placement: { kind: 'document', registry: metadataRegistry },
	});
	const schema = conversion.finish(
		z.toJSONSchema(validator, {
			target,
			io,
			metadata: new LayeredMetadataRegistry(metadataRegistry),
			override: conversion.override,
		}) as JSONSchemaObject,
	);

	if (options?.schemaId) {
		schema.$id = options.schemaId;
	}

	return schema;
}
