import { Ajv } from 'ajv';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { JSONSchemaObject } from '../../src';

/**
 * Compile an exported document with a JSON Schema validator of its dialect, and return what checks an instance.
 *
 * @remarks
 * Compiling resolves every `$ref` and anchor as the specification does, and throws for one that does not resolve, so
 * the tests do not rely on a pointer walk of their own that decodes names the way the export encodes them. Strict mode
 * also rejects a keyword the dialect does not know. `strictTuples` is off, since a tuple with an open rest is valid. `strictTypes` is off: it asks for a `type` beside every keyword
 * that applies to one type, which the open object and many hand-written schemas leave out on purpose. Ajv resolves
 * `$anchor` but does not list it among the keywords strict mode knows, so it is declared.
 */
export function compileJSONSchema(document: JSONSchemaObject): (instance: unknown) => boolean {
	const validator =
		document.$schema === 'http://json-schema.org/draft-07/schema#'
			? new Ajv({ strict: true, strictTypes: false, strictTuples: false })
			: new Ajv2020({ strict: true, strictTypes: false, strictTuples: false });
	validator.addKeyword('$anchor');
	const validate = validator.compile(document);
	return (instance) => validate(instance);
}
