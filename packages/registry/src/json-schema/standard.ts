import type { StandardJSONSchemaV1 } from '@standard-schema/spec';

/**
 * A JSON Schema as a plain object.
 *
 * @remarks
 * The export reads and writes schemas of any dialect, so the type names no keyword: callers narrow what they inspect.
 */
export type JSONSchemaObject = Record<string, unknown>;

const JSON_SCHEMA_TARGETS = ['draft-2020-12', 'draft-07', 'draft-04', 'openapi-3.0'] as const;

/**
 * The JSON Schema dialects a schema can be written for, by their Standard JSON Schema names.
 *
 * @remarks
 * The set is closed, though the Standard JSON Schema type is open, so that each API names the targets it supports and
 * refuses the others. A target added later widens the union, which is additive.
 */
export type JSONSchemaTarget = (typeof JSON_SCHEMA_TARGETS)[number];

/**
 * Throw unless `target` is a {@link JSONSchemaTarget}, and narrow it to one.
 *
 * @param target - A target as a caller wrote it, for example the `target` of a Standard JSON Schema converter's options,
 * which the Standard JSON Schema type leaves open
 * @throws {Error} When `target` is any other string, naming it and the four that are supported
 */
export function assertJSONSchemaTarget(target: string): asserts target is JSONSchemaTarget {
	if ((JSON_SCHEMA_TARGETS as readonly string[]).includes(target)) return;
	throw new Error(
		`The JSON Schema target '${target}' is not supported. Use 'draft-2020-12', 'draft-07', 'draft-04' or 'openapi-3.0'.`,
	);
}

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

/**
 * The own entry of `record` under `key`, or `undefined`.
 *
 * @remarks
 * A child path key is data, and `__proto__` is a valid key. Reading and writing keys through these two functions keeps
 * every one on the document's own properties, so none reaches the prototype chain, whatever its name.
 */
export function getOwn(record: Record<string, unknown>, key: string): unknown {
	return Object.hasOwn(record, key) ? record[key] : undefined;
}

export function setOwn(record: Record<string, unknown>, key: string, value: unknown): void {
	Object.defineProperty(record, key, { value, enumerable: true, writable: true, configurable: true });
}
