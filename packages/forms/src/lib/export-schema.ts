import * as z from 'zod/mini';
import type { StandardJSONSchemaV1 } from '@standard-schema/spec';
import {
	createJSONSchemaEmbedder,
	readStandardJSONSchema,
	type JSONSchemaPlacement,
} from '@schema-engine/registry/json-schema';
import type { JSONSchemaTarget } from '@schema-engine/registry';
import type { JSONSchemaObject } from '@/lib/standard-json-schema';
import { isZodType } from '@/lib/is-zod-type';
import { logger } from '@/lib/logger';

/**
 * How the JSON Schema export reads one registration's schema.
 *
 * - `zod`: a Zod schema (classic or Mini), exported by the Zod converter. The caller may compose it first (closed
 *   appearance axes, typed children and rules).
 * - `standard`: a schema that exports itself, held by a Zod placeholder the conversion replaces with what the schema
 *   returns. Nothing is composed around it.
 * - `open`: a schema the export cannot read. The caller lists it by an open object of its own kind.
 */
export type ExportSchemaSource =
	| { readonly kind: 'zod'; readonly schema: z.ZodMiniType }
	| { readonly kind: 'standard'; readonly schema: z.ZodMiniType }
	| { readonly kind: 'open' };

interface StandardSource {
	readonly vendor: string;
	readonly converter: StandardJSONSchemaV1.Converter;
	readonly open: () => z.ZodMiniType;
}

const STANDARD_SOURCES = new WeakMap<object, StandardSource>();

function vendorOf(schema: unknown): string {
	const standard: unknown = (schema as { '~standard'?: unknown })['~standard'];
	return typeof standard === 'object' &&
		standard !== null &&
		'vendor' in standard &&
		typeof standard.vendor === 'string'
		? standard.vendor
		: 'unknown';
}

/**
 * Decide how the JSON Schema export reads a schema, for every kind it lists: an element, an action, a validation
 * rule and a recipe slot.
 *
 * @param schema - The schema a registration declares, from any Standard Schema library
 * @param open - The open object the caller lists the schema by when it cannot be read. A `standard` schema is listed
 * by it too, for a conversion whose `target` the schema's own converter throws on.
 *
 * @remarks
 * One decision, in this order:
 *
 * 1. A Zod schema (classic or Mini) is exported by the Zod converter. This comes first even though classic Zod also
 *    implements Standard JSON Schema, because the export composes Zod schemas before it converts them (closed
 *    appearance axes, typed children and rules), which a schema that has already exported itself cannot take part
 *    in. Read through `~standard.jsonSchema`, a classic Zod element would lose those, and would export differently
 *    from the same element in Zod Mini.
 * 2. Any other schema that provides Standard JSON Schema (`~standard.jsonSchema`) is exported as what it returns for
 *    the conversion's `io` and `target`; see {@link createExportConversion} for how it is embedded.
 * 3. Anything else is `open`.
 *
 * A `standard` schema is a fresh Zod `any` placeholder on every call, so two registrations that share a schema object
 * keep their own catalog ids.
 */
export function resolveExportSchema(schema: unknown, open: () => z.ZodMiniType): ExportSchemaSource {
	if (isZodType(schema)) return { kind: 'zod', schema };
	const converter = readStandardJSONSchema(schema);
	if (!converter) return { kind: 'open' };
	const placeholder = z.any();
	STANDARD_SOURCES.set(placeholder, { vendor: vendorOf(schema), converter, open });
	return { kind: 'standard', schema: placeholder };
}

/** The embedder's placement, where a collection also names the Zod registry whose ids are its entries. */
export type ConversionPlacement =
	| Extract<JSONSchemaPlacement, { kind: 'document' }>
	| (Extract<JSONSchemaPlacement, { kind: 'collection' }> & {
			readonly registry: { get(schema: z.core.$ZodType): { id?: string } | undefined };
	  });

function withoutSchemaKeyword(schema: JSONSchemaObject): JSONSchemaObject {
	const { $schema: _dropped, ...rest } = schema;
	return structuredClone(rest);
}

/** One Zod conversion of the export: the `override` that writes each `standard` schema, and the step after it. */
export interface ExportConversion {
	readonly override: (context: { zodSchema: z.core.$ZodType; jsonSchema: Record<string, unknown> }) => void;
	/** Adds what the override hoisted to the converted result. */
	readonly finish: (converted: JSONSchemaObject) => JSONSchemaObject;
}

/**
 * Create the `override` of `z.toJSONSchema` that writes each `standard` placeholder's own JSON Schema in its place.
 *
 * @param options - The `io` and `target` of the conversion, passed to each schema's converter, and where it writes
 *
 * @remarks
 * The schema's keywords are written as it returns them, embedded by {@link createJSONSchemaEmbedder}. The catalog
 * metadata Zod wrote on the placeholder (`title`, `description`, `componentType`, `category`, which a document lists for every
 * registration) is kept beside them where the schema does not set the same key, so an agent reading the document still
 * sees what the entry is. They are annotations, so they change nothing the schema accepts. The entry of a collection
 * is the schema's own document root, so it is written there without hoisting.
 *
 * A converter that throws (a target it does not support, as ArkType does for `openapi-3.0`) does not stop the export: the
 * schema is listed by the `open` object it was resolved with, and a warning names its vendor and the target.
 */
export function createExportConversion(options: {
	io: 'input' | 'output';
	target: JSONSchemaTarget;
	placement: ConversionPlacement;
}): ExportConversion {
	const { io, target, placement } = options;
	const embedder = createJSONSchemaEmbedder(target, placement);

	function ownJSONSchema(source: StandardSource): JSONSchemaObject {
		try {
			return source.converter[io]({ target });
		} catch (error) {
			logger.warn(
				`A '${source.vendor}' schema could not write JSON Schema for target '${target}' (${io}), so the export lists it by its shape.`,
				{ error },
			);
			return z.toJSONSchema(source.open(), {
				target,
				io,
				unrepresentable: 'any',
			}) as JSONSchemaObject;
		}
	}

	return {
		override({ zodSchema, jsonSchema }) {
			const source = STANDARD_SOURCES.get(zodSchema);
			if (!source) return;
			const annotations = { ...jsonSchema };
			const own = ownJSONSchema(source);
			const isEntry = placement.kind === 'collection' && placement.registry.get(zodSchema)?.id !== undefined;
			const written = isEntry ? withoutSchemaKeyword(own) : embedder.embed(own);
			for (const key of Object.keys(jsonSchema)) delete jsonSchema[key];
			Object.assign(jsonSchema, annotations, written);
		},
		finish: (converted) => embedder.finish(converted),
	};
}
