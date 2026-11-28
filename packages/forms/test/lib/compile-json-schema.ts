import { Ajv, type SchemaObject } from 'ajv';
import { Ajv2020 } from 'ajv/dist/2020.js';

type Draft = 'draft-2020-12' | 'draft-07';

/**
 * An Ajv of the dialect a document is written for, for tests that check what an export accepts.
 *
 * @remarks
 * `strict` is off because the export lists catalog annotations (`componentType`, `category`) that are no JSON Schema
 * keyword. Compiling still throws for a `$ref` that does not resolve, so a document whose references are wrong fails
 * the test that compiles it.
 */
function createAjv(draft: Draft): Ajv {
	return draft === 'draft-07' ? new Ajv({ strict: false }) : new Ajv2020({ strict: false });
}

/** Compile an exported form config document, and return what checks an instance against it. */
export function compileDocument(
	document: SchemaObject,
	draft: Draft = 'draft-2020-12',
): (instance: unknown) => boolean {
	const validate = createAjv(draft).compile(document);
	return (instance) => validate(instance);
}

/**
 * Compile an exported collection, and return what checks an instance against one of its entries.
 *
 * @remarks
 * Every entry is added by its own `$id`, so the entries refer to each other by the URI the collection was written
 * with, as a tool that takes a collection resolves them.
 */
export function compileCollectionEntry(
	collection: { schemas: Record<string, SchemaObject> },
	uri: string,
	draft: Draft = 'draft-2020-12',
): (instance: unknown) => boolean {
	const ajv = createAjv(draft);
	for (const entry of Object.values(collection.schemas)) ajv.addSchema(entry);
	const validate = ajv.compile({ $ref: uri });
	return (instance) => validate(instance);
}
