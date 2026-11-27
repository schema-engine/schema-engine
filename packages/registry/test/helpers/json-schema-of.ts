import type { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';
import type { JSONSchemaObject } from '../../src';

/**
 * A Standard Schema that accepts anything and exports the JSON Schema it was given, as a schema library that
 * implements Standard JSON Schema would. Each call returns a fresh copy, and `calls` records the options it got.
 */
export function jsonSchemaOf(
	document: JSONSchemaObject,
	calls: { io: string; target: string }[] = [],
): StandardSchemaV1 & StandardJSONSchemaV1 {
	const write = (io: string) => (options: StandardJSONSchemaV1.Options) => {
		calls.push({ io, target: options.target });
		return structuredClone(document);
	};
	return {
		'~standard': {
			version: 1,
			vendor: 'test',
			validate: (value: unknown) => ({ value }),
			jsonSchema: { input: write('input'), output: write('output') },
		},
	};
}
