import * as z from 'zod/mini';
import type { StandardJSONSchemaV1 } from '@standard-schema/spec';
import type { JSONSchemaObject, JSONSchemaTarget } from '@/lib/standard-json-schema';
import { isZodType } from '@/lib/is-zod-type';

/**
 * How the JSON Schema export reads one registration's schema.
 *
 * - `zod`: a Zod schema (classic or Mini), exported by the Zod converter. The caller may compose it first (closed
 *   appearance axes, typed children and rules).
 * - `standard`: a schema that exports itself, held by a Zod placeholder the converter replaces with exactly what the
 *   schema returns. Nothing is composed around it.
 * - `open`: a schema the export cannot read. The caller lists it by an open object of its own kind.
 */
export type ExportSchemaSource =
	| { readonly kind: 'zod'; readonly schema: z.ZodMiniType }
	| { readonly kind: 'standard'; readonly schema: z.ZodMiniType }
	| { readonly kind: 'open' };

/** The Zod names of a target whose Standard JSON Schema name differs. */
const STANDARD_TARGETS: Readonly<Record<string, string>> = { 'draft-7': 'draft-07' };

const JSON_SCHEMA_SOURCES = new WeakMap<object, StandardJSONSchemaV1.Converter>();
const PLACEHOLDERS = new WeakMap<object, z.ZodMiniType>();

function readStandardJSONSchema(schema: unknown): StandardJSONSchemaV1.Converter | undefined {
	if (typeof schema !== 'object' && typeof schema !== 'function') return undefined;
	if (schema === null || !('~standard' in schema)) return undefined;
	const standard = schema['~standard'];
	if (typeof standard !== 'object' || standard === null || !('jsonSchema' in standard)) return undefined;
	const converter = standard.jsonSchema;
	if (typeof converter !== 'object' || converter === null) return undefined;
	if (!('input' in converter) || typeof converter.input !== 'function') return undefined;
	if (!('output' in converter) || typeof converter.output !== 'function') return undefined;
	return converter as StandardJSONSchemaV1.Converter;
}

/**
 * Decide how the JSON Schema export reads a schema, for every kind it lists: an element, an action, a validation
 * rule and a recipe slot.
 *
 * @param schema - The schema a registration declares, from any Standard Schema library
 *
 * @remarks
 * One decision, in this order:
 *
 * 1. A Zod schema (classic or Mini) is exported by the Zod converter. This comes first even though classic Zod also
 *    implements Standard JSON Schema, because the export composes Zod schemas before it converts them (closed
 *    appearance axes, typed children and rules, the catalog metadata registry), which a schema that has already
 *    exported itself cannot take part in. Its output is the same as it has always been.
 * 2. Any other schema that provides Standard JSON Schema (`~standard.jsonSchema`) is exported as exactly what it
 *    returns for the export's `io` and `target`, with no appearance axes, children or catalog metadata added.
 * 3. Anything else is `open`: the caller lists it by an open object of its own kind (an element or recipe slot by its
 *    appearance values, a rule or action by its `$type`).
 *
 * A `standard` schema is a Zod `any` placeholder that stays in the one Zod tree the export converts. The converter
 * (`generateZodJSONSchemaDocument`, `generateZodJSONSchemaCollection`) swaps the placeholder's JSON Schema for the
 * schema's own with {@link createExportOverride}. The same schema always gets the same placeholder. The result is
 * embedded as returned, so a `$ref` in it must resolve inside it (inline its definitions).
 */
export function resolveExportSchema(schema: unknown): ExportSchemaSource {
	if (isZodType(schema)) return { kind: 'zod', schema };
	const converter = readStandardJSONSchema(schema);
	if (!converter || typeof schema !== 'object' || schema === null) return { kind: 'open' };
	let placeholder = PLACEHOLDERS.get(schema);
	if (!placeholder) {
		placeholder = z.any();
		PLACEHOLDERS.set(schema, placeholder);
		JSON_SCHEMA_SOURCES.set(placeholder, converter);
	}
	return { kind: 'standard', schema: placeholder };
}

/**
 * The `override` of `z.toJSONSchema` that writes each `standard` placeholder's own JSON Schema in its place.
 *
 * @param options - The `io` and `target` the Zod conversion runs with, passed to the schema's own converter
 *
 * @remarks
 * The engine takes Zod's target names, so `draft-7` reaches a schema's converter as the Standard name `draft-07`.
 * A target a schema does not support is its own converter's error.
 */
export function createExportOverride(options: {
	io: 'input' | 'output';
	target: JSONSchemaTarget;
}): (context: { zodSchema: z.core.$ZodType; jsonSchema: Record<string, unknown> }) => void {
	return ({ zodSchema, jsonSchema }) => {
		const converter = JSON_SCHEMA_SOURCES.get(zodSchema);
		if (!converter) return;
		const own: JSONSchemaObject = structuredClone(
			converter[options.io]({ target: STANDARD_TARGETS[options.target] ?? options.target }),
		);
		for (const key of Object.keys(jsonSchema)) delete jsonSchema[key];
		Object.assign(jsonSchema, own);
	};
}
