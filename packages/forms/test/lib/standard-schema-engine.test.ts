import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { createFormEngine } from '@/engine/create-form-engine';
import { FormValidationError } from '@/lib/validate-form';
import { safeParseStandardSchema } from '@/lib/standard-schema';
import { anyValue } from './any-value';

type MinimalFixtureConfig = {
	id: string;
	name: string;
	$type: 'minimal-fixture';
};

function createMinimalStandardSchema(): StandardSchemaV1<MinimalFixtureConfig> {
	return {
		'~standard': {
			version: 1,
			vendor: 'schema-engine-test',
			validate(value) {
				if (
					typeof value === 'object' &&
					value !== null &&
					'id' in value &&
					'name' in value &&
					'$type' in value &&
					(value as MinimalFixtureConfig).$type === 'minimal-fixture'
				) {
					return { value: value as MinimalFixtureConfig };
				}

				return { issues: [{ message: 'Invalid minimal-fixture config' }] };
			},
		},
	};
}

describe('native Standard Schema engine path', () => {
	test('treats an empty issue array as failure and preserves structured paths', () => {
		const emptyIssuesSchema: StandardSchemaV1 = {
			'~standard': {
				version: 1,
				vendor: 'schema-engine-test',
				validate: () => ({ issues: [] }),
			},
		};
		const result = safeParseStandardSchema(emptyIssuesSchema, {});
		expect(result).toEqual({ success: false, error: { issues: [] } });

		const schema: StandardSchemaV1<MinimalFixtureConfig> = {
			'~standard': {
				version: 1,
				vendor: 'schema-engine-test',
				validate(value) {
					if (typeof value === 'object' && value !== null && 'id' in value) {
						return { value: value as MinimalFixtureConfig };
					}
					return {
						issues: [
							{
								message: 'Name is invalid',
								path: [{ key: 'profile' }, 'name'],
							},
						],
					};
				},
			},
		};
		const engine = createFormEngine({
			elements: [
				{
					$type: 'path-fixture',
					kind: 'input',
					value: anyValue,
					schema,
					metadata: { name: 'Path fixture', category: 'input' },
					render: () => null,
				},
			],
		});

		const validated = engine.safeValidateForm({
			id: 'path-fixture',
			steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'path-fixture' }] }],
		});
		expect(validated).toEqual({
			success: false,
			issues: [{ path: ['steps', 0, 'elements', 0, 'profile', 'name'], message: 'Name is invalid' }],
		});
	});

	test('createFormEngine -> defineForm accepts a hand-written Standard Schema', () => {
		const engine = createFormEngine({
			elements: [
				{
					$type: 'minimal-fixture',
					kind: 'input',
					value: anyValue,
					schema: createMinimalStandardSchema(),
					metadata: { name: 'Minimal fixture', category: 'input' },
					render: () => null,
				},
			],
		});

		const config = engine.defineForm({
			id: 'native-ss',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'minimal-fixture', id: 'field-1', name: 'field-1' }],
				},
			],
		});

		expect(config.steps[0]?.elements[0]).toMatchObject({ $type: 'minimal-fixture', id: 'field-1' });
		expect(() => engine.generateJSONSchemaCollection()).not.toThrow();
		expect(() => engine.generateFormConfigSchema()).not.toThrow();
	});

	test('rejects invalid native Standard Schema configs with a registration error', () => {
		const engine = createFormEngine({
			elements: [
				{
					$type: 'minimal-fixture',
					kind: 'input',
					value: anyValue,
					schema: createMinimalStandardSchema(),
					metadata: { name: 'Minimal fixture', category: 'input' },
					render: () => null,
				},
			],
		});

		expect(() =>
			engine.validateForm({
				id: 'native-ss-bad',
				steps: [
					{
						id: 'main',
						title: 'Main',
						elements: [{ $type: 'minimal-fixture', id: 'field-1' }],
					},
				],
			}),
		).toThrow(FormValidationError);

		try {
			engine.validateForm({
				id: 'native-ss-bad',
				steps: [
					{
						id: 'main',
						title: 'Main',
						elements: [{ $type: 'minimal-fixture', id: 'field-1' }],
					},
				],
			});
		} catch (error) {
			expect(error).toBeInstanceOf(FormValidationError);
			expect((error as FormValidationError).issues).toEqual([
				{
					path: ['steps', 0, 'elements', 0],
					message: expect.stringContaining('Invalid minimal-fixture config'),
				},
			]);
			expect((error as FormValidationError).message).toMatch(
				/^steps\[0\] \(main\)\.elements\[0\] \(field-1\): Invalid minimal-fixture config/,
			);
			expect((error as FormValidationError).message).not.toMatch(/\.run/);
		}
	});

	test('rejects asynchronous registration schemas in the synchronous config path', () => {
		const asyncSchema: StandardSchemaV1<MinimalFixtureConfig> = {
			'~standard': {
				version: 1,
				vendor: 'schema-engine-test',
				async validate(value) {
					return { value: value as MinimalFixtureConfig };
				},
			},
		};
		const engine = createFormEngine({
			elements: [
				{
					$type: 'async-fixture',
					kind: 'input',
					value: anyValue,
					schema: asyncSchema,
					metadata: { name: 'Async fixture', category: 'input' },
					render: () => null,
				},
			],
		});

		expect(() =>
			engine.validateForm({
				id: 'async-schema',
				steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'async-fixture', id: 'field-1' }] }],
			}),
		).toThrow('Async Standard Schema validation is not supported in this context');
	});

	test('exports distinct input and output JSON Schema for defaulted Mini fields', () => {
		const schema = z.object({
			$type: z.literal('default-fixture'),
			id: z.string(),
			name: z._default(z.string(), 'untitled'),
		});
		const engine = createFormEngine({
			elements: [
				{
					$type: 'default-fixture',
					kind: 'input',
					value: anyValue,
					schema,
					metadata: { name: 'Default fixture', category: 'input' },
					render: () => null,
				},
			],
		});

		const input = engine.generateJSONSchemaCollection({ io: 'input' });
		const output = engine.generateJSONSchemaCollection({ io: 'output' });

		expect(input.schemas['element:default-fixture']?.required).toEqual(['$type', 'id']);
		expect(output.schemas['element:default-fixture']?.required).toEqual(['$type', 'id', 'name']);
	});

	test('Standard JSON Schema wrapper forwards target and preserves input/output schema behavior', () => {
		const schema = z.object({
			$type: z.literal('standard-json-fixture'),
			id: z.string(),
			name: z._default(z.string(), 'untitled'),
		});
		const engine = createFormEngine({
			elements: [
				{
					$type: 'standard-json-fixture',
					kind: 'input',
					value: anyValue,
					schema,
					metadata: { name: 'Standard JSON fixture', category: 'input' },
					render: () => null,
				},
			],
		});
		const standardSchema = engine.getFormConfigStandardSchema()['~standard'];
		const input = standardSchema.jsonSchema.input({ target: 'draft-7' });
		const output = standardSchema.jsonSchema.output({ target: 'draft-7' });

		expect(standardSchema.vendor).toBe('@schema-engine/forms');
		expect(input.$schema).toBe('http://json-schema.org/draft-07/schema#');
		expect(input.$id).toBe('form-config-schema');
		expect(output.$schema).toBe('http://json-schema.org/draft-07/schema#');
		expect(output.$id).toBe('form-config-schema');
		expect(input).not.toEqual(output);
	});
});
