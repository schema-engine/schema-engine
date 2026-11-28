import { Ajv } from 'ajv';
import { Ajv2020 } from 'ajv/dist/2020.js';
import Ajv04 from 'ajv-draft-04';
import { describe, expect, it } from 'vitest';
import { RegistryError } from '../../src';
import {
	createJSONSchemaEmbedder,
	definitionRef,
	definitionsKeyword,
	idKeyword,
	startsResource,
	type JSONSchemaPlacement,
} from '../../src/json-schema';
import type { JSONSchemaObject } from '../../src';

const document: JSONSchemaPlacement = { kind: 'document' };
const thrownBy = (run: () => unknown): unknown => {
	try {
		run();
	} catch (error) {
		return error;
	}
	throw new Error('Expected a throw');
};
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

describe('idKeyword and startsResource', () => {
	it.each([
		['draft-04', 'id'],
		['draft-07', '$id'],
		['draft-2020-12', '$id'],
		['openapi-3.0', '$id'],
	] as const)('the identifier of %s is %s', (target, keyword) => {
		expect(idKeyword(target)).toBe(keyword);
	});

	it('is a resource by the identifier of its target, and a fragment names an anchor instead', () => {
		expect(startsResource({ id: 'https://example.test/a' }, 'draft-04')).toBe(true);
		expect(startsResource({ $id: 'https://example.test/a' }, 'draft-04')).toBe(false);
		expect(startsResource({ id: 'https://example.test/a' }, 'draft-07')).toBe(false);
		expect(startsResource({ $id: 'https://example.test/a' }, 'draft-07')).toBe(true);
		expect(startsResource({ id: '#node' }, 'draft-04')).toBe(false);
		expect(startsResource({ $id: '#node' }, 'draft-2020-12')).toBe(false);
		expect(startsResource({ id: 7 }, 'draft-04')).toBe(false);
	});
});

describe('JSONSchemaEmbedder.embed', () => {
	const declaring = {
		type: 'object',
		properties: { here: { id: '#node', type: 'string' }, there: { $ref: '#node' } },
	};

	describe('Scenario: Two embedded draft-04 schemas declare the same id fragment', () => {
		it('gives each one its own, and its references follow', () => {
			const embedder = createJSONSchemaEmbedder('draft-04', document);

			const first = embedder.embed(declaring);
			const second = embedder.embed(declaring);

			expect(first.properties).toEqual({
				here: { id: '#embedded-1-node', type: 'string' },
				there: { $ref: '#embedded-1-node' },
			});
			expect(second.properties).toEqual({
				here: { id: '#embedded-2-node', type: 'string' },
				there: { $ref: '#embedded-2-node' },
			});
		});

		it('leaves an id of a target that does not write fragments there as it is', () => {
			const embedder = createJSONSchemaEmbedder('draft-07', document);
			expect(embedder.embed(declaring)).toEqual(declaring);
		});

		it('renames the id fragments of a definition under its owner', () => {
			const embedder = createJSONSchemaEmbedder('draft-04', document);

			expect(embedder.embedDefinition(declaring, 'node').properties).toEqual({
				here: { id: '#onode.node', type: 'string' },
				there: { $ref: '#onode.node' },
			});
		});
	});

	describe('Scenario: A draft-04 schema with an id of its own is a resource', () => {
		const child = {
			id: 'https://example.test/child.json',
			definitions: { a: { type: 'string' } },
			properties: {
				x: { $ref: '#/definitions/a' },
				y: { id: '#node', type: 'string' },
				z: { $ref: '#node' },
			},
		};
		const withChild = { type: 'object', properties: { child }, definitions: { own: { type: 'number' } } };

		it('leaves a nested resource as it is, with its anchors and pointers', () => {
			const embedder = createJSONSchemaEmbedder('draft-04', document);

			const definition = embedder.embedDefinition(
				{ ...withChild, properties: { ...withChild.properties, self: { $ref: '#/definitions/own' } } },
				'owner',
			);
			const written = embedder.finish({ definitions: { owner: definition } });

			expect(definition.properties).toEqual({ child, self: { $ref: '#/definitions/owner.own' } });
			expect(Object.keys(written.definitions as object)).toEqual(['owner', 'owner.own']);
		});

		it('keeps a nested resource and an absolute reference into its fragment, which still resolve', () => {
			const schema = {
				type: 'object',
				properties: {
					child: {
						id: 'https://example.test/child.json',
						properties: { n: { id: '#node', type: 'string' } },
					},
					ref: { $ref: 'https://example.test/child.json#node' },
				},
			};

			expect(createJSONSchemaEmbedder('draft-04', document).embed(schema)).toEqual(schema);
			expect(createJSONSchemaEmbedder('draft-04', document).embedDefinition(schema, 'owner')).toEqual(schema);
		});

		it('keeps a root resource as it is, whose references resolve against its own id', () => {
			const root = { ...child, type: 'object' };
			const embedder = createJSONSchemaEmbedder('draft-04', document);

			expect(embedder.embed(root)).toEqual(root);
			expect(embedder.embedDefinition(root, 'owner')).toEqual(root);
			expect(embedder.finish({})).toEqual({});
		});

		describe('resolved by a draft-04 validator', () => {
			const compile = (schema: JSONSchemaObject) => new Ajv04({ strict: false }).compile(schema);

			it("resolves the pointers and anchors of a nested resource within it, and the owner's own definitions", () => {
				const embedder = createJSONSchemaEmbedder('draft-04', document);
				const definition = embedder.embedDefinition(
					{
						type: 'object',
						properties: { child, self: { $ref: '#/definitions/own' } },
						definitions: { own: { type: 'number' } },
					},
					'owner',
				);
				const validate = compile(
					embedder.finish({ definitions: { owner: definition }, $ref: '#/definitions/owner' }),
				);

				expect(validate({ child: { x: 'a', y: 'b', z: 'c' }, self: 1 })).toBe(true);
				expect(validate({ child: { x: 1 } })).toBe(false);
				expect(validate({ child: { z: 1 } })).toBe(false);
				expect(validate({ self: 'a' })).toBe(false);
			});

			it('resolves an absolute reference into the fragment of a nested resource', () => {
				const schema = {
					type: 'object',
					properties: {
						child: {
							id: 'https://example.test/child.json',
							properties: { n: { id: '#node', type: 'string' } },
						},
						ref: { $ref: 'https://example.test/child.json#node' },
					},
				};
				const embedder = createJSONSchemaEmbedder('draft-04', document);
				const validate = compile(
					embedder.finish({
						definitions: { owner: embedder.embedDefinition(schema, 'owner') },
						$ref: '#/definitions/owner',
					}),
				);

				expect(validate({ ref: 'text' })).toBe(true);
				expect(validate({ ref: 1 })).toBe(false);
			});

			it('resolves the references of a root resource kept with its own id', () => {
				const root = { ...child, type: 'object' };
				const embedder = createJSONSchemaEmbedder('draft-04', document);
				const validate = compile(embedder.embedDefinition(root, 'owner'));

				expect(validate({ x: 'a', y: 'b', z: 'c' })).toBe(true);
				expect(validate({ x: 1 })).toBe(false);
			});

			it('keeps two embedded schemas that declare the same id fragment apart, each resolving to its own', () => {
				const embedder = createJSONSchemaEmbedder('draft-04', document);
				const typed = (type: string) => ({
					type: 'object',
					properties: { here: { id: '#node', type }, there: { $ref: '#node' }, next: { $ref: '#' } },
				});
				const first = embedder.embed(typed('string'));
				const second = embedder.embed(typed('number'));
				const validate = compile(embedder.finish({ properties: { first, second } }));

				expect(validate({ first: { here: 'a', there: 'b' }, second: { here: 1, there: 2 } })).toBe(true);
				expect(validate({ first: { there: 1 } })).toBe(false);
				expect(validate({ second: { there: 'a' } })).toBe(false);
				expect(validate({ second: { next: { there: 'a' } } })).toBe(false);
			});
		});

		it('treats id as an ordinary keyword for a target that writes $id', () => {
			const embedder = createJSONSchemaEmbedder('draft-07', document);
			const own = {
				type: 'object',
				properties: {
					child: { id: 'https://example.test/child.json', properties: { x: { $ref: '#/definitions/a' } } },
				},
				definitions: { a: { type: 'string' } },
			};

			expect(embedder.embedDefinition(own, 'owner').properties).toEqual({
				child: { id: 'https://example.test/child.json', properties: { x: { $ref: '#/definitions/owner.a' } } },
			});
		});

		it('writes a collection entry under id, and refers to a resource by its own id', () => {
			const embedder = createJSONSchemaEmbedder('draft-04', { kind: 'collection', uri });

			const entry = embedder.embedDefinition({ ...child, type: 'object' }, 'leaf');
			const recursive = embedder.embed({ type: 'object', properties: { next: { $ref: '#' } } });
			const written = embedder.finish({ schemas: {} });

			expect(entry).toEqual({
				allOf: [{ $ref: 'https://example.test/child.json' }],
				definitions: { leaf: { ...child, type: 'object' } },
			});
			expect(recursive).toEqual({ $ref: uri('embedded-1') });
			expect(written.schemas).toEqual({
				'embedded-1': { id: uri('embedded-1'), type: 'object', properties: { next: { $ref: '#' } } },
			});
		});

		it('drops a root id fragment of a collection entry, with its references turned into #', () => {
			const embedder = createJSONSchemaEmbedder('draft-04', { kind: 'collection', uri });

			expect(
				embedder.embedDefinition(
					{ id: '#node', type: 'object', properties: { next: { $ref: '#node' } } },
					'node',
				),
			).toEqual({ type: 'object', properties: { next: { $ref: '#' } } });
		});
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

		it('throws a RegistryError when a definition it lifts takes a name the document already defines', () => {
			const embedder = createJSONSchemaEmbedder('draft-2020-12', document);
			embedder.embedDefinition(box, 'element:box');

			const error = thrownBy(() => embedder.finish({ $defs: { 'element:box.label': {} } }));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'definition-name-clash',
				$type: 'element:box',
				key: 'element:box.label',
			});
		});

		it('throws a RegistryError instead of overwriting when two embeds lift the same name', () => {
			const embedder = createJSONSchemaEmbedder('draft-2020-12', document);
			embedder.embedDefinition(box, 'element:box');

			expect(thrownBy(() => embedder.embedDefinition(box, 'element:box'))).toMatchObject({
				code: 'definition-name-clash',
				$type: 'element:box',
				key: 'element:box.label',
			});
		});

		it('throws an Error when the document defines a key that embed reserves', () => {
			const embedder = createJSONSchemaEmbedder('draft-2020-12', document);
			embedder.embed({ type: 'object', properties: { next: { $ref: '#' } } });

			const error = thrownBy(() => embedder.finish({ $defs: { 'embedded-1': {} } }));

			expect(error).toBeInstanceOf(Error);
			expect(error).not.toBeInstanceOf(RegistryError);
			expect((error as Error).message).toBe(
				"The embedder reserves 'embedded-1'; the document already defines it.",
			);
		});

		it('keeps owners whose lifted names would join to the same text apart, and both resolve under Ajv', () => {
			const embedder = createJSONSchemaEmbedder('draft-2020-12', document);
			const owned = (reference: string, definitions: Record<string, JSONSchemaObject>) => ({
				type: 'object',
				properties: { x: { $ref: reference } },
				$defs: definitions,
			});
			const first = embedder.embedDefinition(owned('#/$defs/b.c', { 'b.c': { type: 'string' } }), 'element:a');
			const second = embedder.embedDefinition(owned('#/$defs/c', { c: { type: 'number' } }), 'element:a.b');
			const written = embedder.finish({
				$defs: { 'element:a': first, 'element:a.b': second },
				anyOf: [{ $ref: '#/$defs/element:a' }, { $ref: '#/$defs/element:a.b' }],
			});

			expect(Object.keys(written.$defs as object).sort()).toEqual([
				'element:a',
				'element:a.b',
				'element:a.b.c',
				'element:a_2e_b.c',
			]);
			const validate = new Ajv2020({ strict: false }).compile(written);
			expect([validate({ x: 'a' }), validate({ x: 1 }), validate({ x: true })]).toEqual([true, true, false]);
		});

		it('keeps owners whose joined anchors would match apart, and every reference resolves under Ajv', () => {
			const embedder = createJSONSchemaEmbedder('draft-2020-12', document);
			const anchored = (anchor: string, type: string) => ({
				type: 'object',
				properties: { a: { $anchor: anchor, type }, b: { $ref: `#${anchor}` } },
			});
			const first = embedder.embedDefinition(anchored('b-c', 'string'), 'element:a');
			const second = embedder.embedDefinition(anchored('c', 'number'), 'element:a-b');
			const written = embedder.finish({
				$defs: { 'element:a': first, 'element:a-b': second },
				anyOf: [{ $ref: '#/$defs/element:a' }, { $ref: '#/$defs/element:a-b' }],
			});

			expect(first.properties).toMatchObject({
				a: { $anchor: 'oelement_3a_a.b-c' },
				b: { $ref: '#oelement_3a_a.b-c' },
			});
			expect(second.properties).toMatchObject({
				a: { $anchor: 'oelement_3a_a-b.c' },
				b: { $ref: '#oelement_3a_a-b.c' },
			});
			const validate = new Ajv2020({ strict: false }).compile(written);
			expect([validate({ a: 'x', b: 'y' }), validate({ a: 1, b: 2 }), validate({ a: 1, b: 'y' })]).toEqual([
				true,
				true,
				false,
			]);
		});

		it.each([
			['my-card', 'omy-card.x'],
			['element:phone-input', 'oelement_3a_phone-input.x'],
			['ui/button', 'oui_2f_button.x'],
			['a.b', 'oa_2e_b.x'],
			['my_card', 'omy_5f_card.x'],
		])('writes the anchor x of owner %j as %s', (owner, anchor) => {
			const embedder = createJSONSchemaEmbedder('draft-2020-12', document);

			const definition = embedder.embedDefinition({ type: 'object', properties: { a: { $anchor: 'x' } } }, owner);

			expect(definition.properties).toEqual({ a: { $anchor: anchor } });
			expect(anchor).toMatch(/^[A-Za-z][-A-Za-z0-9._]*$/);
		});

		it('renames an anchor under the name of the definition', () => {
			const embedder = createJSONSchemaEmbedder('draft-2020-12', document);
			const definition = embedder.embedDefinition(
				{ type: 'object', properties: { a: { $anchor: 'node', type: 'string' }, b: { $ref: '#node' } } },
				'box',
			);

			expect(definition).toEqual({
				type: 'object',
				properties: { a: { $anchor: 'obox.node', type: 'string' }, b: { $ref: '#obox.node' } },
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

		it('writes a schema with an $id of its own as a reference to it, so the entry keeps the collection URI', () => {
			const embedder = createJSONSchemaEmbedder('draft-2020-12', { kind: 'collection', uri });
			const resource = {
				$schema: 'https://json-schema.org/draft/2020-12/schema',
				$id: 'https://example.test/leaf',
				type: 'object',
				properties: { label: { $ref: '#/$defs/label' } },
				$defs: { label: { type: 'string' } },
			};

			const entry = embedder.embedDefinition(resource, 'element:leaf');

			expect(entry).toEqual({
				allOf: [{ $ref: 'https://example.test/leaf' }],
				$defs: { 'element:leaf': { ...resource, $schema: undefined } },
			});
			expect(entry).not.toHaveProperty('$id');
		});

		it.each(['draft-07', 'draft-04', 'openapi-3.0'] as const)(
			'writes no $ref beside other keywords for %s, where a strict tool ignores them',
			(target) => {
				const embedder = createJSONSchemaEmbedder(target, { kind: 'collection', uri });

				const entry = embedder.embedDefinition(
					{
						[idKeyword(target)]: 'https://example.test/leaf',
						type: 'object',
						definitions: { label: { type: 'string' } },
					},
					'leaf',
				);

				expect(entry).not.toHaveProperty('$ref');
				expect(entry).toMatchObject({
					allOf: [{ $ref: 'https://example.test/leaf' }],
					definitions: { leaf: {} },
				});
				expect(entry).not.toHaveProperty('$defs');
				expect(Object.keys(entry).filter((key) => key !== 'allOf' && key !== 'definitions')).toEqual([]);
			},
		);

		it('is resolved by Ajv from another entry through the collection URI, with the schema keeping its own base', () => {
			const embedder = createJSONSchemaEmbedder('draft-2020-12', { kind: 'collection', uri });
			const entry = embedder.embedDefinition(
				{
					$id: 'https://example.test/leaf',
					type: 'object',
					properties: { label: { $ref: '#/$defs/label' } },
					$defs: { label: { type: 'string' } },
				},
				'leaf',
			);
			const ajv = new Ajv2020({ strict: false });
			ajv.addSchema({ ...entry, $id: uri('leaf') });
			const validate = ajv.compile({ $ref: uri('leaf') });

			expect([validate({ label: 'x' }), validate({ label: 1 })]).toEqual([true, false]);
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
