import type { StandardJSONSchemaV1 } from '@standard-schema/spec';

/**
 * A JSON Schema as a plain object.
 *
 * @remarks
 * The export reads and writes schemas of any dialect, so the type names no keyword: callers narrow what they inspect.
 */
export type JSONSchemaObject = Record<string, unknown>;

/** The Standard JSON Schema target a schema is written for, for example `'draft-2020-12'`. */
export type JSONSchemaTarget = StandardJSONSchemaV1.Target;

/**
 * The Standard JSON Schema converter of a schema (`~standard.jsonSchema`), when it provides one.
 *
 * @remarks
 * {@link exportTreeSchema} reads each registration's schema through it unless the caller passes its own `resolve`.
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

/** Only ordinary records and null-prototype value maps are walked as schemas. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false;
	const prototype: unknown = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}
