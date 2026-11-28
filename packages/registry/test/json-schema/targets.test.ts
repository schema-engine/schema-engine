import { describe, expect, it } from 'vitest';
import { createRegistry, exportTreeSchema, type BaseRegistration, type JSONSchemaTarget } from '../../src';
import { assertJSONSchemaTarget, createJSONSchemaEmbedder } from '../../src/json-schema';
import { jsonSchemaOf } from '../helpers/json-schema-of';

/** A target a JavaScript caller can pass, which the types refuse. */
const unsupported = (target: string) => target as 'draft-07';
const asTarget = (target: string): JSONSchemaTarget => target as JSONSchemaTarget;

const registryOf = (calls: { io: string; target: string }[]) =>
	createRegistry('Node', [
		{
			$type: 'box',
			schema: jsonSchemaOf({ type: 'object', properties: { $type: { const: 'box' } } }, calls),
			metadata: { name: 'Box' },
		} as BaseRegistration,
	]);

describe('JSON Schema targets', () => {
	describe('Scenario: exportTreeSchema writes draft-2020-12 and draft-07 and refuses any other target', () => {
		it.each(['draft-7', 'draft-4', 'draft-04', 'openapi-3.0', 'typo', 'toString'])(
			'throws for %j before it reads any schema',
			(target) => {
				const calls: { io: string; target: string }[] = [];

				expect(() => exportTreeSchema(registryOf(calls), { target: unsupported(target) })).toThrow(
					`exportTreeSchema writes 'draft-2020-12' or 'draft-07', not '${target}'.`,
				);
				expect(calls).toEqual([]);
			},
		);

		it('keeps the dialect of a supported target', () => {
			const document = exportTreeSchema(registryOf([]), { target: 'draft-07' });

			expect(document.$schema).toBe('http://json-schema.org/draft-07/schema#');
			expect(Object.keys(document)).toContain('definitions');
			expect(exportTreeSchema(registryOf([])).$schema).toBe('https://json-schema.org/draft/2020-12/schema');
		});
	});

	describe('Scenario: The embedder takes the four targets and refuses any other', () => {
		it.each(['draft-2020-12', 'draft-07', 'draft-04', 'openapi-3.0'] as const)('accepts %s', (target) => {
			expect(() => createJSONSchemaEmbedder(target, { kind: 'document' })).not.toThrow();
		});

		it.each(['draft-7', 'draft-4', 'typo', 'toString'])('throws for %j', (target) => {
			expect(() => createJSONSchemaEmbedder(asTarget(target), { kind: 'document' })).toThrow(
				`The JSON Schema target '${target}' is not supported. Use 'draft-2020-12', 'draft-07', 'draft-04' or 'openapi-3.0'.`,
			);
		});
	});

	describe('assertJSONSchemaTarget', () => {
		it('passes the four targets and throws for any other string', () => {
			for (const target of ['draft-2020-12', 'draft-07', 'draft-04', 'openapi-3.0']) {
				expect(() => assertJSONSchemaTarget(target)).not.toThrow();
			}
			expect(() => assertJSONSchemaTarget('draft-7')).toThrow(
				"The JSON Schema target 'draft-7' is not supported.",
			);
		});
	});
});
