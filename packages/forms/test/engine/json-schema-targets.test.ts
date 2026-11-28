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
