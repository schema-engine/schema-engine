import { describe, expectTypeOf, it } from 'vitest';
import {
	exportTreeSchema,
	type ExportSchemaContext,
	type ExportTreeSchemaOptions,
	type JSONSchemaTarget,
} from '../../src';
import { createJSONSchemaEmbedder } from '../../src/json-schema';

describe('JSONSchemaTarget', () => {
	it('is the closed set of Standard JSON Schema names', () => {
		expectTypeOf<JSONSchemaTarget>().toEqualTypeOf<'draft-2020-12' | 'draft-07' | 'draft-04' | 'openapi-3.0'>();
	});

	it('is narrowed by exportTreeSchema to the two dialects it writes', () => {
		expectTypeOf<NonNullable<ExportTreeSchemaOptions['target']>>().toEqualTypeOf<'draft-2020-12' | 'draft-07'>();
		expectTypeOf<ExportSchemaContext['target']>().toEqualTypeOf<'draft-2020-12' | 'draft-07'>();
	});

	it('is refused by exportTreeSchema for openapi-3.0 and the Zod spellings', () => {
		const lookup = { all: () => [] };

		// @ts-expect-error openapi-3.0 is not a target exportTreeSchema writes
		const openapi = () => exportTreeSchema(lookup, { target: 'openapi-3.0' });
		// @ts-expect-error draft-7 is Zod's spelling, not the Standard one
		const zodSpelling = () => exportTreeSchema(lookup, { target: 'draft-7' });

		expectTypeOf(openapi).toBeFunction();
		expectTypeOf(zodSpelling).toBeFunction();
	});

	it('is the type of the embedder target', () => {
		expectTypeOf(createJSONSchemaEmbedder).parameter(0).toEqualTypeOf<JSONSchemaTarget>();
	});
});
