import { Ajv } from 'ajv';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import {
	createJSONSchemaEmbedder,
	definitionRef,
	definitionsKeyword,
	type JSONSchemaPlacement,
} from '../../src/json-schema';
import type { JSONSchemaObject } from '../../src';

const document: JSONSchemaPlacement = { kind: 'document' };
const uri = (id: string) => `https://example.test/${id}.json`;

const box: JSONSchemaObject = {
	$schema: 'https://json-schema.org/draft/2020-12/schema',
	type: 'object',
	properties: { label: { $ref: '#/$defs/label' }, kids: { type: 'array' }, self: { $ref: '#' } },
	$defs: { label: { type: 'string' } },
};

describe('definitionsKeyword', () => {
	it.each([
		['draft-2020-12', '$defs'],
		['draft-07', 'definitions'],
		['draft-04', 'definitions'],
		['openapi-3.0', 'definitions'],
	] as const)('is %s for %s', (target, keyword) => {
		expect(definitionsKeyword(target)).toBe(keyword);
	});
});

describe('JSONSchemaEmbedder.embedDefinition', () => {
	describe('Scenario: A schema that refers into itself stays at its own definition in a document', () => {
		it('rewrites # and the pointers into its own definitions, and lifts the definitions it brought along', () => {
			const embedder = createJSONSchemaEmbedder('draft-2020-12', document);

			const definition = embedder.embedDefinition(box, 'element:box');
			const written = embedder.finish({ $defs: { 'element:box': definition } });

			expect(definition).toEqual({
				type: 'object',
				properties: {
					label: { $ref: '#/$defs/element:box.label' },
					kids: { type: 'array' },
					self: { $ref: '#/$defs/element:box' },
				},
			});
			expect(written.$defs).toEqual({
				'element:box': definition,
				'element:box.label': { type: 'string' },
			});
		});

		it('resolves every reference it wrote, in a draft-2020-12 and a draft-07 document', () => {
			for (const target of ['draft-2020-12', 'draft-07'] as const) {
				const embedder = createJSONSchemaEmbedder(target, document);
				const definition = embedder.embedDefinition(box, 'ui/box');
				const written = embedder.finish({
					[definitionsKeyword(target)]: { 'ui/box': definition },
					$ref: definitionRef(target, 'ui/box'),
				});
				const validate = (
					target === 'draft-07' ? new Ajv({ strict: false }) : new Ajv2020({ strict: false })
				).compile(written);

				expect(validate({ label: 'x', self: { label: 'y' } })).toBe(true);
				expect(validate({ label: 1 })).toBe(false);
				expect(validate({ self: { label: 1 } })).toBe(false);
			}
		});

		it('keeps a schema with an $id of its own as it is, and brings nothing along', () => {
			const embedder = createJSONSchemaEmbedder('draft-2020-12', document);
			const resource = { $id: 'https://example.test/box', type: 'object', $defs: { label: { type: 'string' } } };

			expect(embedder.embedDefinition(resource, 'box')).toEqual(resource);
			expect(embedder.finish({})).toEqual({});
		});

		it('throws when a definition it lifts takes a name the document already defines', () => {
			const embedder = createJSONSchemaEmbedder('draft-2020-12', document);
			embedder.embedDefinition(box, 'element:box');

			expect(() => embedder.finish({ $defs: { 'element:box.label': {} } })).toThrow(
				"The JSON Schema export already defines 'element:box.label'.",
			);
		});

		it('renames an anchor under the name of the definition', () => {
			const embedder = createJSONSchemaEmbedder('draft-2020-12', document);
			const definition = embedder.embedDefinition(
				{ type: 'object', properties: { a: { $anchor: 'node', type: 'string' }, b: { $ref: '#node' } } },
				'box',
			);

			expect(definition).toEqual({
				type: 'object',
				properties: { a: { $anchor: 'box-node', type: 'string' }, b: { $ref: '#box-node' } },
			});
		});
	});

	describe('Scenario: A schema is the entry of a collection as it is', () => {
		it('drops $schema and keeps its own definitions and pointers, which resolve inside the entry', () => {
			const embedder = createJSONSchemaEmbedder('draft-2020-12', { kind: 'collection', uri });

			const entry = embedder.embedDefinition(box, 'element:box');

			expect(entry).toEqual({
				type: 'object',
				properties: box.properties,
				$defs: box.$defs,
			});
			expect(entry).not.toBe(box);
			expect(embedder.finish({ schemas: {} })).toEqual({ schemas: {} });
		});

		it('turns a draft-07 root $id fragment into #, since the entry is addressed by its assigned $id', () => {
			const embedder = createJSONSchemaEmbedder('draft-07', { kind: 'collection', uri });

			const entry = embedder.embedDefinition(
				{ $id: '#node', type: 'object', properties: { next: { $ref: '#node' } } },
				'node',
			);

			expect(entry).toEqual({ type: 'object', properties: { next: { $ref: '#' } } });
		});
	});
});
