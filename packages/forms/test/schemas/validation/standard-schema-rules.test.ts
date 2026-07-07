import { describe, expect, test } from 'bun:test';
import { safeParseStandardSchema } from '@/lib/standard-schema';
import { buildFormDataValidator } from '@/schemas/validation/utils';
import {
	createStandardFormDataSchema,
	createStandardSchemaFromRules,
} from '@/schemas/validation/standard-schema-rules';
import { ValidationPresets } from '@/schemas/validation/validation-registry';

describe('createStandardSchemaFromRules', () => {
	test('validates via ~standard.validate without Zod parse', () => {
		const schema = createStandardSchemaFromRules([
			ValidationPresets.string.required('Required'),
			ValidationPresets.string.minLength(3),
		]);

		expect(safeParseStandardSchema(schema, 'abc').success).toBe(true);
		expect(safeParseStandardSchema(schema, '').success).toBe(false);
		expect(safeParseStandardSchema(schema, 'ab').success).toBe(false);
	});
});

describe('createStandardFormDataSchema', () => {
	test('validates form field data via Standard Schema', () => {
		const schema = createStandardFormDataSchema([
			{
				name: 'username',
				rules: [ValidationPresets.string.required(), ValidationPresets.string.minLength(3)],
			},
			{
				name: 'email',
				rules: [ValidationPresets.string.email()],
			},
		]);

		expect(
			safeParseStandardSchema(schema, {
				username: 'jdoe',
				email: 'john@example.com',
			}).success,
		).toBe(true);

		expect(
			safeParseStandardSchema(schema, {
				username: 'jd',
				email: 'not-an-email',
			}).success,
		).toBe(false);
	});
});

describe('buildFormDataValidator', () => {
	test('validates form submission data via Standard Schema', () => {
		const validator = buildFormDataValidator({
			steps: [
				{
					elements: [
						{
							name: 'username',
							rules: [ValidationPresets.string.required(), ValidationPresets.string.minLength(3)],
						},
					],
				},
			],
		});

		expect(safeParseStandardSchema(validator, { username: 'jane' }).success).toBe(true);
		expect(safeParseStandardSchema(validator, { username: 'ja' }).success).toBe(false);
	});
});
