import * as z from 'zod/mini';
import type { StandardJSONSchemaV1 } from '@standard-schema/spec';
import type { JSONSchemaObject, JSONSchemaTarget } from '@/lib/standard-json-schema';
import { isPlainObject } from '@/lib/is-plain-object';
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

/** The Standard JSON Schema names of the targets Zod also accepts by an older name. */
const STANDARD_TARGETS: Readonly<Record<string, string>> = { 'draft-7': 'draft-07', 'draft-4': 'draft-04' };

const STANDARD_SOURCES = new WeakMap<object, StandardSource>();

/**
 * The Standard JSON Schema converter of a schema (`~standard.jsonSchema`), when it provides one.
 */
export function readStandardJSONSchema(schema: unknown): StandardJSONSchemaV1.Converter | undefined {
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

/** Where the JSON Schema being written keeps its definitions. */
export type JSONSchemaPlacement =
	| { readonly kind: 'document' }
	| {
			readonly kind: 'collection';
			/** The URI the collection refers to an entry by. */
			readonly uri: (id: string) => string;
			/** The registry whose ids are the collection's entries. */
			readonly registry: { get(schema: z.core.$ZodType): { id?: string } | undefined };
	  };

/** Keywords whose value is data rather than a schema, so a `$ref` key inside it is not a reference. */
const DATA_KEYWORDS = new Set(['const', 'enum', 'default', 'examples']);

/** Keywords whose value maps names to schemas, so a key there is a name rather than a keyword. */
const NAMED_SCHEMA_KEYWORDS = new Set([
	'properties',
	'patternProperties',
	'$defs',
	'definitions',
	'dependentSchemas',
	'dependencies',
]);

const isLocalPointer = (ref: string): boolean => ref === '#' || ref.startsWith('#/');

/**
 * Whether a schema is the root of a resource of its own, which resolves its references against itself. A draft-07
 * `$id` that is only a fragment (`#node`) names an anchor instead.
 */
const startsResource = (schema: Record<string, unknown>): boolean =>
	typeof schema.$id === 'string' && !schema.$id.startsWith('#');

/**
 * A copy of a schema's root resource with `rewrite` applied to each string keyword of every schema in it. A keyword
 * is replaced where `rewrite` returns another value.
 *
 * @remarks
 * A subschema with its own `$id` is another resource: its references and anchors are relative to it, not to the
 * schema being embedded, so it is copied as it is. The root is walked whatever its `$id`; the embedder embeds a root
 * that starts a resource as it is.
 */
function mapResource(node: unknown, rewrite: (keyword: string, value: string) => string, isRoot = true): unknown {
	if (Array.isArray(node)) return node.map((item) => mapResource(item, rewrite, false));
	if (!isPlainObject(node)) return node;
	if (!isRoot && startsResource(node)) return structuredClone(node);
	const copy: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(node)) {
		if (typeof value === 'string') copy[key] = rewrite(key, value);
		else if (DATA_KEYWORDS.has(key)) copy[key] = structuredClone(value);
		else if (NAMED_SCHEMA_KEYWORDS.has(key) && isPlainObject(value)) {
			copy[key] = Object.fromEntries(
				Object.entries(value).map(([name, schema]) => [name, mapResource(schema, rewrite, false)]),
			);
		} else copy[key] = mapResource(value, rewrite, false);
	}
	return copy;
}

/** The anchor names a schema's root resource declares: `$anchor`, `$dynamicAnchor` and a draft-07 `$id: '#name'`. */
function declaredAnchors(schema: JSONSchemaObject): Set<string> {
	const names = new Set<string>();
	mapResource(schema, (keyword, value) => {
		if (keyword === '$anchor' || keyword === '$dynamicAnchor') names.add(value);
		else if (keyword === '$id' && value.startsWith('#')) names.add(value.slice(1));
		return value;
	});
	return names;
}

/**
 * A copy of a schema's root resource with its local JSON Pointer references passed through `pointer`, and each
 * anchor it declares, with the `#name` references to it, renamed by `anchor`.
 */
function rewriteResource(
	schema: JSONSchemaObject,
	rewrite: { readonly pointer?: (pointer: string) => string; readonly anchor?: (name: string) => string },
): JSONSchemaObject {
	const anchors = rewrite.anchor ? declaredAnchors(schema) : new Set<string>();
	const renamed = (name: string) => (rewrite.anchor && anchors.has(name) ? rewrite.anchor(name) : name);
	return mapResource(schema, (keyword, value) => {
		if (keyword === '$anchor' || keyword === '$dynamicAnchor') return renamed(value);
		if (keyword === '$id' && value.startsWith('#')) return `#${renamed(value.slice(1))}`;
		if (keyword !== '$ref' && keyword !== '$dynamicRef') return value;
		if (isLocalPointer(value)) return rewrite.pointer ? rewrite.pointer(value) : value;
		return value.startsWith('#') ? `#${renamed(value.slice(1))}` : value;
	}) as JSONSchemaObject;
}

function withoutSchemaKeyword(schema: JSONSchemaObject): JSONSchemaObject {
	const { $schema: _dropped, ...rest } = schema;
	return structuredClone(rest);
}

function hasLocalRef(schema: JSONSchemaObject): boolean {
	let found = false;
	mapResource(schema, (keyword, value) => {
		if (keyword === '$ref' && isLocalPointer(value)) found = true;
		return value;
	});
	return found;
}

/** The keyword a document keeps its definitions under, as Zod writes it for the target. */
const definitionsKeyword = (target: string): '$defs' | 'definitions' =>
	target === 'draft-2020-12' ? '$defs' : 'definitions';

/**
 * Embeds JSON Schemas that were written as documents of their own (by a Standard JSON Schema converter or a separate
 * Zod conversion) into one JSON Schema being written.
 */
export interface JSONSchemaEmbedder {
	/** The schema to write in place of `own`, which is not changed. */
	embed(own: JSONSchemaObject): JSONSchemaObject;
	/** Adds the definitions `embed` hoisted to the finished document or collection, in place. */
	finish(written: JSONSchemaObject): JSONSchemaObject;
}

/**
 * Create the embedder for one JSON Schema being written.
 *
 * @param target - The target the schema is written for
 * @param placement - Whether it is one document or a collection of entries
 *
 * @remarks
 * `$schema` is dropped, since the document being written declares the dialect. A schema whose `$ref` points into
 * itself from its root (`#`, `#/$defs/node`, as ArkType writes a recursive type) would point at the wrong root once
 * embedded, so it is hoisted: in a document, into its definitions under a key of its own (`embedded-1`), with each of
 * its local pointers prefixed by that place; in a collection, as an entry of its own, referred to by its URI. The
 * references stay `#/...` pointers and `#name` anchors, which is what AI tool APIs resolve, rather than `$id` URIs.
 *
 * A plain-name anchor (`$anchor`, `$dynamicAnchor`, a draft-07 `$id: '#node'`) resolves anywhere in the document, so
 * two schemas that each declare `node` would declare it twice. Each embedded schema's anchors, and the `#node`
 * references to them, are renamed to carry its key (`embedded-1-node`), whether it is hoisted into a document or
 * embedded where it stands. A schema hoisted into a collection is a resource of its own by its `$id`, which scopes
 * its anchors, so they keep their names.
 *
 * Only the schema's root resource is rewritten. A schema with its own `$id`, and any subschema that sets one, resolves
 * its pointers and anchors against that and is left as it is.
 */
export function createJSONSchemaEmbedder(target: string, placement: JSONSchemaPlacement): JSONSchemaEmbedder {
	const keyword = definitionsKeyword(target);
	const hoisted: Record<string, JSONSchemaObject> = {};
	let count = 0;
	return {
		embed(own) {
			const body = withoutSchemaKeyword(own);
			if (startsResource(body)) return body;
			const pointsIntoItself = hasLocalRef(body);
			if (!pointsIntoItself && declaredAnchors(body).size === 0) return body;
			count += 1;
			const key = `embedded-${count}`;
			if (pointsIntoItself && placement.kind === 'collection') {
				const ref = placement.uri(key);
				hoisted[key] = { ...(own.$schema === undefined ? {} : { $schema: own.$schema }), $id: ref, ...body };
				return { $ref: ref };
			}
			const ref = `#/${keyword}/${key}`;
			const rewritten = rewriteResource(body, {
				pointer: pointsIntoItself ? (pointer) => `${ref}${pointer.slice(1)}` : undefined,
				anchor: (name) => `${key}-${name}`,
			});
			if (!pointsIntoItself) return rewritten;
			hoisted[key] = rewritten;
			return { $ref: ref };
		},
		finish(written) {
			if (Object.keys(hoisted).length === 0) return written;
			const field = placement.kind === 'collection' ? 'schemas' : keyword;
			const existing: JSONSchemaObject = isPlainObject(written[field]) ? written[field] : {};
			for (const key of Object.keys(hoisted)) {
				if (key in existing) throw new Error(`The JSON Schema export already defines '${key}'.`);
			}
			written[field] = { ...existing, ...hoisted };
			return written;
		},
	};
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
 * The engine takes Zod's target names, so `draft-7` reaches a converter as `draft-07`. A converter that throws (a
 * target it does not support, as ArkType does for `openapi-3.0`) does not stop the export: the schema is listed by the
 * `open` object it was resolved with, and a warning names its vendor and the target.
 */
export function createExportConversion(options: {
	io: 'input' | 'output';
	target: JSONSchemaTarget;
	placement: JSONSchemaPlacement;
}): ExportConversion {
	const { io, target, placement } = options;
	const embedder = createJSONSchemaEmbedder(target, placement);
	const standardTarget = STANDARD_TARGETS[target] ?? target;

	function ownJSONSchema(source: StandardSource): JSONSchemaObject {
		try {
			return source.converter[io]({ target: standardTarget });
		} catch (error) {
			logger.warn(
				`A '${source.vendor}' schema could not write JSON Schema for target '${standardTarget}' (${io}), so the export lists it by its shape.`,
				{ error },
			);
			return z.toJSONSchema(source.open(), { target, io, unrepresentable: 'any' }) as JSONSchemaObject;
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
