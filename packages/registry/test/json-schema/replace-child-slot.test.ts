import { describe, expect, it } from 'vitest';
import { RegistryError, type JSONSchemaObject } from '../../src';
import { replaceChildSlot } from '../../src/json-schema';

const union: JSONSchemaObject = { anyOf: [{ $ref: '#/$defs/leaf' }, { $ref: '#/$defs/text' }] };

const slot = (definition: JSONSchemaObject, keys: readonly string[] = ['kids']): JSONSchemaObject => {
	replaceChildSlot(definition, { $type: 'box', keys }, union);
	return definition;
};

const listed = (definition: JSONSchemaObject): JSONSchemaObject => {
	replaceChildSlot(definition, { $type: 'box', keys: ['kids'], list: true }, union);
	return definition;
};

const thrown = (run: () => unknown): unknown => {
	try {
		run();
	} catch (error) {
		return error;
	}
	throw new Error('Expected replaceChildSlot to throw');
};

describe('replaceChildSlot', () => {
	describe('Scenario: The slot is replaced by what it is, and nothing around it', () => {
		it('takes the union for the items of an array and keeps its bounds and annotations', () => {
			const definition = slot({
				type: 'object',
				required: ['kids'],
				properties: { kids: { type: 'array', items: {}, minItems: 1, maxItems: 3, default: [] } },
			});

			expect(definition).toEqual({
				type: 'object',
				required: ['kids'],
				properties: { kids: { type: 'array', items: union, minItems: 1, maxItems: 3, default: [] } },
			});
		});

		it('becomes the union for an object slot and keeps its annotations', () => {
			const definition = slot({
				type: 'object',
				properties: { kids: { type: 'object', properties: {}, description: 'One child' } },
			});

			expect(definition.properties).toEqual({ kids: { description: 'One child', ...union } });
		});

		it('becomes a child or a list of children for an open slot', () => {
			const definition = slot({ type: 'object', properties: { kids: { title: 'Either' } } });

			expect(definition.properties).toEqual({
				kids: { title: 'Either', anyOf: [union, { type: 'array', items: union }] },
			});
		});

		it('reads a nested key path', () => {
			const definition = slot(
				{ type: 'object', properties: { aside: { type: 'object', properties: { header: {} } } } },
				['aside', 'header'],
			);

			expect(definition.properties).toEqual({
				aside: { type: 'object', properties: { header: { anyOf: [union, { type: 'array', items: union }] } } },
			});
		});

		it('gives every position of a tuple the union and keeps a rest that is closed', () => {
			const definition = slot({
				type: 'object',
				properties: { kids: { type: 'array', prefixItems: [{}, {}], items: false } },
			});

			expect(definition.properties).toEqual({
				kids: { type: 'array', prefixItems: [union, union], items: false },
			});
		});

		it('writes a copy of the union at each place, so changing one leaves the others', () => {
			const definition = slot({
				type: 'object',
				properties: { kids: { type: 'array', prefixItems: [{}, {}], items: {} } },
			});
			const kids = (definition.properties as Record<string, { prefixItems: JSONSchemaObject[] }>).kids!;

			expect(kids.prefixItems[0]).not.toBe(kids.prefixItems[1]);
			expect(kids.prefixItems[0]).not.toBe(union);
		});
	});

	describe('Scenario: A child path that holds a list', () => {
		it('writes an open slot as an array of the union, and keeps its annotations', () => {
			const definition = listed({ type: 'object', properties: { kids: { title: 'Kids' } } });

			expect(definition.properties).toEqual({ kids: { title: 'Kids', type: 'array', items: union } });
		});

		it('writes the schema true as an array of the union', () => {
			const definition = listed({ type: 'object', properties: { kids: true } });

			expect(definition.properties).toEqual({ kids: { type: 'array', items: union } });
		});

		it('replaces the items of an array as it does without list', () => {
			const definition = listed({
				type: 'object',
				properties: { kids: { type: 'array', items: {}, minItems: 1 } },
			});

			expect(definition.properties).toEqual({ kids: { type: 'array', items: union, minItems: 1 } });
		});

		it('throws unreachable-child-path for an object slot, which holds one node and no list', () => {
			const error = thrown(() =>
				listed({ type: 'object', properties: { kids: { type: 'object', properties: {} } } }),
			);

			expect(error).toMatchObject({ code: 'unreachable-child-path', $type: 'box', childPath: ['kids'] });
		});
	});

	describe("Scenario: The definition's own root is the caller's to check", () => {
		it('replaces the slot of a definition whose root sets an $id, as a collection entry does', () => {
			const definition = slot({
				$id: 'https://example.com/box',
				type: 'object',
				properties: { kids: { type: 'array', items: {} } },
			});

			expect(definition.properties).toEqual({ kids: { type: 'array', items: union } });
		});
	});

	describe('Scenario: A slot the walk cannot reach throws', () => {
		it.each([
			['behind a $ref', { type: 'object', properties: { kids: { $ref: '#/$defs/list' } } }],
			['behind allOf', { type: 'object', properties: { kids: { allOf: [{ type: 'array' }] } } }],
			['not declared', { type: 'object', properties: {} }],
			[
				'nullable, as OpenAPI 3.0 writes it for an array',
				{ type: 'object', properties: { kids: { type: 'array', items: {}, nullable: true } } },
			],
			[
				'nullable, as OpenAPI 3.0 writes it for an object',
				{ type: 'object', properties: { kids: { type: 'object', properties: {}, nullable: true } } },
			],
			[
				'inside a schema with an $id of its own, between the definition and the slot',
				{
					type: 'object',
					properties: {
						aside: { $id: 'https://example.com/aside', type: 'object', properties: { kids: {} } },
					},
				},
			],
		])('throws RegistryError unreachable-child-path for a slot %s', (_name, definition) => {
			const error = thrown(() => slot(definition));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({ code: 'unreachable-child-path', $type: 'box', childPath: ['kids'] });
		});
	});

	describe('Scenario: A child path without keys throws', () => {
		it('throws RegistryError invalid-child-paths and leaves the definition alone', () => {
			const definition = { type: 'object', properties: { kids: { type: 'array', items: {} } } };
			const before = structuredClone(definition);

			const error = thrown(() => replaceChildSlot(definition, { $type: 'box', keys: [] }, union));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({ code: 'invalid-child-paths', $type: 'box', childPath: [] });
			expect((error as Error).message).toContain("'box'");
			expect(definition).toEqual(before);
		});
	});
});
