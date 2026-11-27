import * as v from 'valibot';
import * as classic from 'zod';
import { describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import type { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';
import { createFormEngine } from '@/engine/create-form-engine';
import { logger } from '@/lib/logger';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';
import type { ValidationRegistration } from '@/schemas/validation';
import { anyValue } from '../lib/any-value';

type JSONSchema = Record<string, unknown>;

/**
 * A Standard Schema written by hand that accepts any value and exports the JSON Schema it is given, per `io`.
 * The `target` the export asks for is recorded, so a test sees what the converter passed.
 */
function exporting(
	input: JSONSchema,
	output: JSONSchema = input,
	targets: string[] = [],
): StandardSchemaV1 & StandardJSONSchemaV1 {
	return {
		'~standard': {
			version: 1,
			vendor: 'schema-engine-test',
			validate: (value: unknown) => ({ value }),
			jsonSchema: {
				input: (options) => {
					targets.push(options.target);
					return input;
				},
				output: (options) => {
					targets.push(options.target);
					return output;
				},
			},
		},
	};
}

/** The same schema without the JSON Schema half. */
function validating(): StandardSchemaV1 {
	return {
		'~standard': { version: 1, vendor: 'schema-engine-test', validate: (value: unknown) => ({ value }) },
	};
}

const widgetInput = { type: 'object', title: 'Widget input', properties: { $type: { const: 'widget' } } };
const widgetOutput = { type: 'object', title: 'Widget output', properties: { $type: { const: 'widget' } } };
const pingInput = { type: 'object', title: 'Ping input', properties: { $type: { const: 'ping' } } };
const pingOutput = { type: 'object', title: 'Ping output', properties: { $type: { const: 'ping' } } };
const evenRule = { type: 'object', title: 'Even rule', properties: { $type: { const: 'even' } } };
const shellInput = { type: 'object', title: 'Shell input', properties: { accent: { type: 'string' } } };
const shellOutput = { type: 'object', title: 'Shell output', properties: { accent: { type: 'string' } } };

const targets: string[] = [];

const engine = createFormEngine({
	elements: [
		{
			$type: 'widget',
			kind: 'input',
			value: anyValue,
			schema: exporting(widgetInput, widgetOutput, targets),
			metadata: { name: 'Widget', category: 'input' },
			render: () => null,
		},
	],
	actions: [
		{
			$type: 'ping',
			schema: exporting(pingInput, pingOutput),
			metadata: { name: 'Ping', description: 'Ping an endpoint' },
			execute: async () => ({ status: 'success' }),
		},
	],
	validations: [
		{
			$type: 'even',
			schema: exporting(evenRule),
			metadata: { name: 'Even' },
			category: 'number',
			handler: () => z.number(),
		} as ValidationRegistration,
	],
	recipes: [
		defineFormRecipe(
			defineRecipeSpec({
				$type: 'brand',
				kind: 'single-step',
				metadata: { name: 'Brand', description: 'A recipe whose shell slot exports itself' },
				slotSchemas: {
					shell: exporting(shellInput, shellOutput),
					header: z.object({ title: z.optional(z.string()) }),
				},
			}),
			{},
		),
	],
});

type Collection = { schemas: Record<string, JSONSchema> };
const collection = (options?: Parameters<typeof engine.generateJSONSchemaCollection>[0]) =>
	engine.generateJSONSchemaCollection(options) as unknown as Collection;

/** The definition of the `ping` action in its own document, which the document refers to by `$ref`. */
function actionDefinition(options?: Parameters<typeof engine.generateActionConfigSchema>[1]): JSONSchema {
	const document = engine.generateActionConfigSchema('ping', options) as unknown as {
		$defs: Record<string, JSONSchema>;
	};
	return document.$defs['action:ping']!;
}

/** An entry of the collection without the `$id` and `$schema` the collection gives every entry. */
function entry(schemas: Collection['schemas'], id: string): JSONSchema {
	const { $id: _id, $schema: _schema, ...rest } = schemas[id]!;
	return rest;
}

describe('a schema that provides Standard JSON Schema is exported as exactly what it returns', () => {
	test('an element', () => {
		expect(entry(collection().schemas, 'element:widget')).toEqual(widgetInput);
	});

	test('an action, in the collection and as its own document, which adds the catalog annotations it lacks', () => {
		expect(entry(collection().schemas, 'action:ping')).toEqual(pingInput);
		expect(actionDefinition()).toEqual({ ...pingInput, description: 'Ping an endpoint', componentType: 'action' });
	});

	test('a validation rule, as a member of the rule union the elements refer to', () => {
		expect(entry(collection().schemas, 'validation-rule').anyOf).toContainEqual(evenRule);
	});

	test('a recipe slot, beside a Zod slot of the same recipe', () => {
		const view = engine.describeRecipe('brand').viewSchema as { $defs: Record<string, { properties: JSONSchema }> };
		const { shell, header } = view.$defs['recipe:brand']!.properties;
		expect(shell).toEqual({ ...shellInput, default: {} });
		expect(Object.keys((header as { properties: JSONSchema }).properties).toSorted()).toEqual([
			'appearance',
			'title',
		]);
	});

	test('uses the output side for io output, and passes the target the export asks for', () => {
		targets.length = 0;
		expect(entry(collection({ io: 'output' }).schemas, 'element:widget')).toEqual(widgetOutput);
		expect(actionDefinition({ io: 'output' })).toMatchObject(pingOutput);
		collection({ target: 'draft-7' });
		collection({ target: 'draft-4' });
		expect(targets).toEqual(['draft-2020-12', 'draft-07', 'draft-04']);
	});

	test('a schema that is a function, as an ArkType type is', () => {
		const callable = Object.assign(() => undefined, exporting(widgetInput));
		const functional = createFormEngine({
			elements: [
				{
					$type: 'widget',
					kind: 'input',
					value: anyValue,
					schema: callable,
					metadata: { name: 'Widget', category: 'input' },
					render: () => null,
				},
			],
		});
		expect(
			entry((functional.generateJSONSchemaCollection() as unknown as Collection).schemas, 'element:widget'),
		).toEqual(widgetInput);
	});

	test('does not change the object the schema returned', () => {
		const returned = { type: 'object', properties: {} };
		const once = createFormEngine({
			elements: [
				{
					$type: 'once',
					kind: 'input',
					value: anyValue,
					schema: exporting(returned),
					metadata: { name: 'Once', category: 'input' },
					render: () => null,
				},
			],
		});
		once.generateJSONSchemaCollection();
		expect(returned).toEqual({ type: 'object', properties: {} });
	});
});

describe('a schema the export cannot read is listed as an open object', () => {
	const open = createFormEngine({
		elements: [
			{
				$type: 'widget',
				kind: 'input',
				value: anyValue,
				schema: validating(),
				metadata: { name: 'Widget', category: 'input' },
				render: () => null,
			},
			{
				$type: 'note',
				kind: 'input',
				value: anyValue,
				schema: v.object({ $type: v.literal('note') }),
				metadata: { name: 'Note', category: 'input' },
				render: () => null,
			},
		],
		actions: [
			{
				$type: 'ping',
				schema: v.object({ $type: v.literal('ping') }),
				metadata: { name: 'Ping' },
				execute: async () => ({ status: 'success' }),
			},
		],
		validations: [
			{
				$type: 'even',
				schema: v.object({ $type: v.literal('even') }),
				metadata: { name: 'Even' },
				category: 'number',
				handler: () => z.number(),
			} as ValidationRegistration,
		],
	});

	test('a Valibot or hand-written element, action and rule are listed by their $type', () => {
		const config = JSON.stringify(open.generateFormConfigSchema());
		expect(config).toContain('"const":"widget"');
		expect(config).toContain('"const":"note"');
		expect(config).toContain('"const":"ping"');
		const rules = open.generateJSONSchemaCollection().schemas as unknown as Record<string, unknown>;
		expect(JSON.stringify(rules['validation-rule'])).toContain('"const":"even"');
		expect(open.generateActionConfigSchema('ping')).toBeUndefined();
	});
});

describe('a Zod schema keeps the Zod converter, though classic Zod also provides Standard JSON Schema', () => {
	test('closes the appearance of a classic Zod element, which the schema alone does not', () => {
		const engineWithClassic = createFormEngine({
			elements: [
				{
					$type: 'classic',
					kind: 'input',
					value: anyValue,
					schema: classic.object({ $type: classic.literal('classic'), label: classic.string() }),
					metadata: { name: 'Classic', category: 'input' },
					render: () => null,
				},
			],
		});
		const exported = engineWithClassic.generateJSONSchemaCollection().schemas as unknown as Record<
			string,
			{ properties: Record<string, JSONSchema> }
		>;
		expect(exported['element:classic']!.properties.appearance).toMatchObject({ type: 'object' });
	});
});

/** The schema a local JSON Pointer `$ref` (`#/a/b`) points at in a document. */
function resolve(document: unknown, ref: string): JSONSchema {
	expect(ref.startsWith('#/')).toBe(true);
	const target = ref
		.slice(2)
		.split('/')
		.map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
		.reduce<unknown>((node, segment) => (node as Record<string, unknown> | undefined)?.[segment], document);
	expect(target).toBeTypeOf('object');
	return target as JSONSchema;
}

/** A recursive schema as ArkType writes one: `$schema`, a root `$ref` and its `$defs`. */
const tree = {
	$schema: 'https://json-schema.org/draft/2020-12/schema',
	$ref: '#/$defs/node',
	$defs: {
		node: {
			type: 'object',
			properties: { $type: { const: 'tree' }, children: { type: 'array', items: { $ref: '#/$defs/node' } } },
		},
	},
};

describe('a schema that exports itself is embedded so its own references still resolve', () => {
	const recursive = createFormEngine({
		elements: [
			{
				$type: 'tree',
				kind: 'input',
				value: anyValue,
				schema: exporting(tree),
				metadata: { name: 'Tree', category: 'input' },
				render: () => null,
			},
			{
				$type: 'ruled',
				kind: 'input',
				value: anyValue,
				schema: z.object({ $type: z.literal('ruled'), rules: z.optional(z.array(z.looseObject({}))) }),
				metadata: { name: 'Ruled', category: 'input' },
				render: () => null,
			},
		],
		validations: [
			{
				$type: 'tree',
				schema: exporting(tree),
				metadata: { name: 'Tree rule' },
				category: 'string',
				handler: () => z.string(),
			} as ValidationRegistration,
		],
	});

	test('drops $schema, since the document declares the dialect', () => {
		const flat = createFormEngine({
			elements: [
				{
					$type: 'flat',
					kind: 'input',
					value: anyValue,
					schema: exporting({ $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object' }),
					metadata: { name: 'Flat', category: 'input' },
					render: () => null,
				},
			],
		});
		const config = JSON.stringify(flat.generateFormConfigSchema());
		expect(config.match(/"\$schema"/g)).toHaveLength(1);
	});

	test('in a document, hoists it into the definitions and points its references there', () => {
		const document = recursive.generateFormConfigSchema() as JSONSchema & { $defs: Record<string, JSONSchema> };
		const member = (document.$defs['validation-rule']!.anyOf as JSONSchema[]).find((rule) => '$ref' in rule)!;
		const hoisted = resolve(document, member.$ref as string);
		expect(hoisted).not.toHaveProperty('$schema');
		const node = resolve(document, hoisted.$ref as string);
		const items = (node.properties as { children: { items: { $ref: string } } }).children.items;
		expect(resolve(document, items.$ref)).toBe(node);
		expect(node.properties).toMatchObject({ $type: { const: 'tree' } });
	});

	test('in a collection, writes it as an entry of its own, referred to by its URI', () => {
		const { schemas } = recursive.generateJSONSchemaCollection() as unknown as Collection;
		const member = (schemas['validation-rule']!.anyOf as JSONSchema[]).find((rule) => '$ref' in rule)!;
		const id = (member.$ref as string).replace('#/definitions/', '');
		const { $id, $schema, ...own } = schemas[id]!;
		expect($id).toBe(member.$ref);
		expect($schema).toBe(tree.$schema);
		expect(own).toEqual({ $ref: tree.$ref, $defs: tree.$defs });
	});

	test('in a collection, an entry that is the schema itself keeps its references as they are', () => {
		const { schemas } = recursive.generateJSONSchemaCollection() as unknown as Collection;
		expect(entry(schemas, 'element:tree')).toEqual({ $ref: tree.$ref, $defs: tree.$defs });
	});
});

describe('a schema whose converter throws for a target is listed by its shape', () => {
	test('the export still succeeds, and warns with the vendor and target', () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
		const unsupported: StandardSchemaV1 & StandardJSONSchemaV1 = {
			'~standard': {
				version: 1,
				vendor: 'strict-lib',
				validate: (value: unknown) => ({ value }),
				jsonSchema: {
					input: (options) => {
						if (options.target !== 'draft-2020-12') throw new Error('unsupported');
						return { type: 'object', title: 'Exact' };
					},
					output: () => ({}),
				},
			},
		};
		const strict = createFormEngine({
			elements: [
				{
					$type: 'strict',
					kind: 'input',
					value: anyValue,
					schema: unsupported,
					metadata: { name: 'Strict', category: 'input' },
					render: () => null,
				},
			],
			actions: [
				{
					$type: 'strict-action',
					schema: unsupported,
					metadata: { name: 'Strict action' },
					execute: async () => ({ status: 'success' }),
				},
			],
		});
		const { schemas } = strict.generateJSONSchemaCollection({ target: 'openapi-3.0' }) as unknown as Collection;
		expect(schemas['element:strict']).toMatchObject({
			type: 'object',
			properties: { $type: { enum: ['strict'] }, appearance: { type: 'object' } },
		});
		expect(schemas['action:strict-action']).toMatchObject({ properties: { $type: { enum: ['strict-action'] } } });
		expect(warn).toHaveBeenCalledWith(expect.stringMatching(/'strict-lib'.*'openapi-3\.0'/), expect.anything());
		expect(
			entry((strict.generateJSONSchemaCollection() as unknown as Collection).schemas, 'element:strict'),
		).toEqual({ type: 'object', title: 'Exact' });
		warn.mockRestore();
	});
});

describe('two registrations that share one schema object', () => {
	test('each keeps its own entry and catalog annotations', () => {
		const shared = exporting({ type: 'object' });
		const twins = createFormEngine({
			actions: ['one', 'two'].map(($type) => ({
				$type,
				schema: shared,
				metadata: { name: $type, description: `Action ${$type}` },
				execute: async () => ({ status: 'success' as const }),
			})),
		});
		const { schemas } = twins.generateJSONSchemaCollection() as unknown as Collection;
		expect(entry(schemas, 'action:one')).toEqual({ type: 'object' });
		expect(entry(schemas, 'action:two')).toEqual({ type: 'object' });
		for (const $type of ['one', 'two']) {
			const document = twins.generateActionConfigSchema($type) as { $defs: Record<string, JSONSchema> };
			expect(document.$defs[`action:${$type}`]).toMatchObject({ description: `Action ${$type}` });
		}
	});
});
