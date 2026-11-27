import * as v from 'valibot';
import * as classic from 'zod';
import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import type { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';
import { createFormEngine } from '@/engine/create-form-engine';
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

	test('an action, in the collection and as its own document', () => {
		expect(entry(collection().schemas, 'action:ping')).toEqual(pingInput);
		expect(actionDefinition()).toEqual(pingInput);
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
		expect(actionDefinition({ io: 'output' })).toEqual(pingOutput);
		collection({ target: 'draft-7' });
		expect(targets).toEqual(['draft-2020-12', 'draft-07']);
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
