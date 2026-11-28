import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import type { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';
import type { JSONSchemaTarget } from '@schema-engine/registry';
import { createFormEngine } from '@/engine/create-form-engine';
import type { ValidationRegistration } from '@/schemas/validation';
import { anyValue } from '../lib/any-value';

const converted: string[] = [];

const write = (options: StandardJSONSchemaV1.Options) => {
	converted.push(options.target);
	return { type: 'object' };
};

/** A Standard Schema that records the target of every conversion asked of it. */
const recording = (): StandardSchemaV1 & StandardJSONSchemaV1 => ({
	'~standard': {
		version: 1,
		vendor: 'schema-engine-test',
		validate: (value: unknown) => ({ value }),
		jsonSchema: { input: write, output: write },
	},
});

const engine = createFormEngine({
	elements: [
		{
			$type: 'widget',
			kind: 'input',
			value: anyValue,
			schema: recording(),
			metadata: { name: 'Widget', category: 'input' },
			render: () => null,
		},
	],
	actions: [
		{
			$type: 'ping',
			schema: recording(),
			metadata: { name: 'Ping', description: 'Ping an endpoint' },
			execute: async () => ({ status: 'success' }),
		},
	],
	validations: [
		{
			$type: 'even',
			schema: recording(),
			metadata: { name: 'Even' },
			category: 'number',
			handler: () => z.number(),
		} as ValidationRegistration,
	],
});

/** A target a JavaScript caller can pass, which the types refuse. */
const unsupported = (target: string) => target as JSONSchemaTarget;

const message = (target: string) =>
	`The JSON Schema target '${target}' is not supported. Use 'draft-2020-12', 'draft-07', 'draft-04' or 'openapi-3.0'.`;

describe('a JSON Schema target the export does not support throws before any schema is converted', () => {
	const rejected = ['draft-7', 'draft-4', 'draft-2019-09', 'typo', ''];

	test.each(rejected)('generateFormConfigSchema, target %j', (target) => {
		converted.length = 0;
		expect(() => engine.generateFormConfigSchema({ target: unsupported(target) })).toThrow(message(target));
		expect(converted).toEqual([]);
	});

	test.each(rejected)('generateJSONSchemaCollection, target %j', (target) => {
		converted.length = 0;
		expect(() => engine.generateJSONSchemaCollection({ target: unsupported(target) })).toThrow(message(target));
		expect(converted).toEqual([]);
	});

	test.each(rejected)('generateActionConfigSchema, target %j', (target) => {
		converted.length = 0;
		expect(() => engine.generateActionConfigSchema('ping', { target: unsupported(target) })).toThrow(
			message(target),
		);
		expect(converted).toEqual([]);
	});

	test('generateActionConfigSchema throws for an action the engine lacks too, so the target is always checked', () => {
		expect(() => engine.generateActionConfigSchema('missing', { target: unsupported('draft-7') })).toThrow(
			message('draft-7'),
		);
	});

	test.each(rejected)('the Standard form converter, input and output, target %j', (target) => {
		converted.length = 0;
		const { jsonSchema } = engine.getFormConfigStandardSchema()['~standard'];
		expect(() => jsonSchema.input({ target })).toThrow(message(target));
		expect(() => jsonSchema.output({ target })).toThrow(message(target));
		expect(converted).toEqual([]);
	});

	test.each(rejected)('the Standard action converter, input and output, target %j', (target) => {
		converted.length = 0;
		const { jsonSchema } = engine.getActionConfigStandardSchema('ping')!['~standard'];
		expect(() => jsonSchema.input({ target })).toThrow(message(target));
		expect(() => jsonSchema.output({ target })).toThrow(message(target));
		expect(converted).toEqual([]);
	});
});

describe('the Standard JSON Schema names are the ones the export writes', () => {
	test.each([
		['draft-2020-12', 'https://json-schema.org/draft/2020-12/schema'],
		['draft-07', 'http://json-schema.org/draft-07/schema#'],
		['draft-04', 'http://json-schema.org/draft-04/schema#'],
	] as const)('generateFormConfigSchema, target %s, passes it to a schema that exports itself', (target, dialect) => {
		converted.length = 0;
		expect(engine.generateFormConfigSchema({ target }).$schema).toBe(dialect);
		expect(new Set(converted)).toEqual(new Set([target]));
	});

	test('openapi-3.0 is accepted', () => {
		expect(() => engine.generateFormConfigSchema({ target: 'openapi-3.0' })).not.toThrow();
	});
});

describe('a draft-04 export names its resources by id, which a draft-04 validator reads, not $id', () => {
	const uri = (id: string) => `https://example.test/${id}.json`;
	const leaf = {
		'~standard': {
			version: 1,
			vendor: 'schema-engine-test',
			validate: (value: unknown) => ({ value }),
			jsonSchema: {
				input: () => ({ id: 'https://example.test/leaf', type: 'object' }),
				output: () => ({ id: 'https://example.test/leaf', type: 'object' }),
			},
		},
	} satisfies StandardSchemaV1 & StandardJSONSchemaV1;
	const resourceEngine = createFormEngine({
		elements: [
			{
				$type: 'leaf',
				kind: 'input',
				value: anyValue,
				schema: leaf,
				metadata: { name: 'Leaf', category: 'input' },
				render: () => null,
			},
		],
	});

	test('every entry of the collection is addressed by id, as it is by $id for the other targets', () => {
		for (const [target, keyword, other] of [
			['draft-04', 'id', '$id'],
			['draft-07', '$id', 'id'],
		] as const) {
			const { schemas } = engine.generateJSONSchemaCollection({ target, uri }) as unknown as {
				schemas: Record<string, Record<string, unknown>>;
			};

			expect(Object.keys(schemas).length).toBeGreaterThan(0);
			for (const [name, entry] of Object.entries(schemas)) {
				expect(entry[keyword], name).toBe(uri(name));
				expect(entry, name).not.toHaveProperty(other);
			}
		}
	});

	test('an entry whose schema has an id of its own refers to it, and is addressed by the collection id', () => {
		const { schemas } = resourceEngine.generateJSONSchemaCollection({ target: 'draft-04', uri }) as unknown as {
			schemas: Record<string, Record<string, unknown>>;
		};

		expect(schemas['element:leaf']).toMatchObject({
			id: uri('element:leaf'),
			allOf: [{ $ref: 'https://example.test/leaf' }],
		});
		expect(schemas['element:leaf']).not.toHaveProperty('$id');
	});

	test('the form config document is addressed by id for draft-04', () => {
		const document = engine.generateFormConfigSchema({ target: 'draft-04' }) as unknown as Record<string, unknown>;

		expect(document.id).toBe('form-config-schema');
		expect(document).not.toHaveProperty('$id');
	});
});
