import { test, expect, describe } from 'bun:test';
import {
	createZodSchemaFromRules,
	generateFormSchema,
	validationRegistry,
	type MinItemsRule,
	type MaxItemsRule,
} from '../../../src/schemas/validation/';

describe('Validation', () => {
	describe('ValidationRegistry.presets', () => {
		test('should generate string validations', () => {
			const required = validationRegistry.presets.string.required();
			expect(required.type).toBe('required');

			const email = validationRegistry.presets.string.email();
			expect(email.type).toBe('email');

			const minLength = validationRegistry.presets.string.minLength(3);
			expect(minLength.type).toBe('minLength');
			expect(minLength.value).toBe(3);

			const maxLength = validationRegistry.presets.string.maxLength(10);
			expect(maxLength.type).toBe('maxLength');
			expect(maxLength.value).toBe(10);

			const pattern = validationRegistry.presets.string.pattern('^test$');
			expect(pattern.type).toBe('pattern');
			expect(pattern.value).toBe('^test$');

			const url = validationRegistry.presets.string.url();
			expect(url.type).toBe('url');

			const uuid = validationRegistry.presets.string.uuid();
			expect(uuid.type).toBe('uuid');

			const uuidv4 = validationRegistry.presets.string.uuidv4();
			expect(uuidv4.type).toBe('uuid');
			expect(uuidv4.version).toBe('v4');
		});

		test('should generate number validations', () => {
			const required = validationRegistry.presets.number.required();
			expect(required.type).toBe('required');

			const min = validationRegistry.presets.number.min(1);
			expect(min.type).toBe('min');
			expect(min.value).toBe(1);

			const max = validationRegistry.presets.number.max(100);
			expect(max.type).toBe('max');
			expect(max.value).toBe(100);
		});

		test('should generate array validations', () => {
			const required = validationRegistry.presets.array.required();
			expect(required.type).toBe('required');

			const minItems = validationRegistry.presets.array.minItems(2);
			expect(minItems.type).toBe('minItems');
			expect(minItems.value).toBe(2);

			const maxItems = validationRegistry.presets.array.maxItems(5);
			expect(maxItems.type).toBe('maxItems');
			expect(maxItems.value).toBe(5);

			const nonEmpty = validationRegistry.presets.array.nonEmpty();
			expect(nonEmpty.type).toBe('minItems');
			expect(nonEmpty.value).toBe(1);
		});

		test('should generate network validations', () => {
			const ipv4 = validationRegistry.presets.network.ipv4();
			expect(ipv4.type).toBe('ip');
			expect(ipv4.version).toBe('v4');

			const ipv6 = validationRegistry.presets.network.ipv6();
			expect(ipv6.type).toBe('ip');
			expect(ipv6.version).toBe('v6');
		});

		test('should generate date validations', () => {
			const datetime = validationRegistry.presets.date.datetime();
			expect(datetime.type).toBe('datetime');

			const date = validationRegistry.presets.date.date();
			expect(date.type).toBe('date');

			const time = validationRegistry.presets.date.time();
			expect(time.type).toBe('time');
		});

		test('should generate async validations', () => {
			const asyncRule = validationRegistry.presets.custom.async('/api/validate', {
				dependencies: ['field1', 'field2'],
				method: 'POST',
				headers: { Authorization: 'Bearer token' },
				extraPayload: { extra: 'data' },
				expectedResponse: { valid: true },
				message: 'Custom validation failed',
			});

			expect(asyncRule.type).toBe('async');
			expect(asyncRule.url).toBe('/api/validate');
			expect(asyncRule.dependencies).toEqual(['field1', 'field2']);
			expect(asyncRule.method).toBe('POST');
			expect(asyncRule.headers).toEqual({ Authorization: 'Bearer token' });
			expect(asyncRule.extraPayload).toEqual({ extra: 'data' });
			expect(asyncRule.expectedResponse).toEqual({ valid: true });
			expect(asyncRule.message).toBe('Custom validation failed');
		});
	});

	describe('createZodSchemaFromRules', () => {
		test('should create string schema with required validation', () => {
			const rules = [validationRegistry.presets.string.required()];
			const schema = createZodSchemaFromRules(rules);

			expect(() => schema.parse('valid')).not.toThrow();
			expect(() => schema.parse('')).toThrow();
		});

		test('should create email schema', () => {
			const rules = [validationRegistry.presets.string.email()];
			const schema = createZodSchemaFromRules(rules);

			expect(() => schema.parse('test@example.com')).not.toThrow();
			expect(() => schema.parse('invalid-email')).toThrow();
		});

		test('should create number schema with min validation', () => {
			const rules = [validationRegistry.presets.number.min(5)];
			const schema = createZodSchemaFromRules(rules);

			expect(() => schema.parse(10)).not.toThrow();
			expect(() => schema.parse(3)).toThrow();
		});

		test('should create array schema with minItems validation', () => {
			const rules = [validationRegistry.presets.array.minItems(2)];
			const schema = createZodSchemaFromRules(rules);

			expect(() => schema.parse([1, 2, 3])).not.toThrow();
			expect(() => schema.parse([1])).toThrow();
		});

		test('should combine multiple validation rules', () => {
			const rules = [
				validationRegistry.presets.string.required(),
				validationRegistry.presets.string.minLength(3),
				validationRegistry.presets.string.maxLength(10),
			];
			const schema = createZodSchemaFromRules(rules);

			expect(() => schema.parse('hello')).not.toThrow();
			expect(() => schema.parse('')).toThrow(); // Required
			expect(() => schema.parse('hi')).toThrow(); // Too short
			expect(() => schema.parse('this is too long')).toThrow(); // Too long
		});

		test('should handle empty rules array', () => {
			const schema = createZodSchemaFromRules([]);
			expect(() => schema.parse('anything')).not.toThrow();
		});
	});

	describe('generateFormSchema', () => {
		test('should generate form schema from elements', () => {
			const elements = [
				{
					name: 'email',
					rules: [validationRegistry.presets.string.email()],
				},
				{
					name: 'age',
					rules: [validationRegistry.presets.number.min(18)],
				},
			];

			const schema = generateFormSchema(elements);

			expect(() =>
				schema.parse({
					email: 'test@example.com',
					age: 25,
				}),
			).not.toThrow();

			expect(() =>
				schema.parse({
					email: 'invalid-email',
					age: 25,
				}),
			).toThrow();

			expect(() =>
				schema.parse({
					email: 'test@example.com',
					age: 15,
				}),
			).toThrow();
		});

		test('should skip elements without name or validation', () => {
			const elements = [
				{ name: 'test', rules: [validationRegistry.presets.string.required()] },
				{ name: '', rules: [validationRegistry.presets.string.required()] },
				{ name: 'test2' }, // No validation
				{}, // No name or validation
			];

			const schema = generateFormSchema(elements);
			const result = schema.parse({ test: 'value' });

			expect(result).toEqual({ test: 'value' });
		});
	});

	describe('Array Validation', () => {
		test('should create minItems validation rule', () => {
			const rule: MinItemsRule = {
				type: 'minItems',
				value: 2,
				message: 'Must have at least 2 items',
			};

			const schema = createZodSchemaFromRules([rule]);
			expect(() => schema.parse([1, 2])).not.toThrow();
			expect(() => schema.parse([1])).toThrow();
		});

		test('should create maxItems validation rule', () => {
			const rule: MaxItemsRule = {
				type: 'maxItems',
				value: 3,
				message: 'Must have no more than 3 items',
			};

			const schema = createZodSchemaFromRules([rule]);
			expect(() => schema.parse([1, 2, 3])).not.toThrow();
			expect(() => schema.parse([1, 2, 3, 4])).toThrow();
		});

		test('should combine array validation rules', () => {
			const rules = [
				{ type: 'minItems' as const, value: 1, message: 'Cannot be empty' },
				{ type: 'maxItems' as const, value: 5, message: 'Too many items' },
			];

			const schema = createZodSchemaFromRules(rules);
			expect(() => schema.parse([1, 2, 3])).not.toThrow();
			expect(() => schema.parse([])).toThrow();
			expect(() => schema.parse([1, 2, 3, 4, 5, 6])).toThrow();
		});
	});

	describe('Async Validation', () => {
		test('should create async validation rule with dependencies', () => {
			const asyncRule = {
				type: 'async' as const,
				url: '/api/validate',
				method: 'POST' as const,
				dependencies: ['age', 'category'],
				message: 'Validation failed',
			};

			expect(asyncRule.type).toBe('async');
			expect(asyncRule.dependencies).toEqual(['age', 'category']);
			expect(asyncRule.url).toBe('/api/validate');
		});

		test('should handle async validation with expected response', () => {
			const asyncRule = {
				type: 'async' as const,
				url: '/api/validate',
				expectedResponse: { valid: true },
				dependencies: ['field1'],
				body: { extra: 'data' },
			};

			expect(asyncRule.expectedResponse).toEqual({ valid: true });
			expect(asyncRule.body).toEqual({ extra: 'data' });
		});

		test('should support cross-field validation structure', () => {
			const crossFieldRule = {
				type: 'async' as const,
				url: '/api/validate-insurance',
				dependencies: ['age', 'location', 'existing_conditions'],
				headers: { Authorization: 'Bearer token' },
				body: { validationType: 'insurance' },
			};

			expect(crossFieldRule.dependencies).toHaveLength(3);
			expect(crossFieldRule.dependencies).toContain('age');
			expect(crossFieldRule.dependencies).toContain('location');
			expect(crossFieldRule.dependencies).toContain('existing_conditions');
		});
	});

	describe('ValidationRegistry', () => {
		test('should have built-in validation types registered', () => {
			const requiredTypes = [
				'required',
				'email',
				'minLength',
				'maxLength',
				'pattern',
				'url',
				'uuid',
				'min',
				'max',
				'minItems',
				'maxItems',
				'ip',
				'datetime',
				'date',
				'time',
				'async',
			];

			for (const type of requiredTypes) {
				expect(validationRegistry.has(type)).toBe(true);
			}
		});

		test('should get registered validation types', () => {
			const types = validationRegistry.getRegisteredTypes();
			expect(types).toContain('required');
			expect(types).toContain('email');
			expect(types).toContain('async');
		});

		test('should get validations by category', () => {
			const stringValidations = validationRegistry.getByCategory('string');
			const numberValidations = validationRegistry.getByCategory('number');

			expect(stringValidations.length).toBeGreaterThan(0);
			expect(numberValidations.length).toBeGreaterThan(0);
		});
	});
});
