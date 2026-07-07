import { test, expect, describe } from 'bun:test';
import {
	createZodSchemaFromRules,
	generateFormSchema,
	ValidationPresets,
	validationRegistry,
	type MinItemsRule,
	type MaxItemsRule,
} from '../../../src/schemas/validation/';

describe('Validation', () => {
	describe('ValidationPresets', () => {
		test('should generate string validations', () => {
			const required = ValidationPresets.string.required();
			expect(required.type).toBe('required');

			const email = ValidationPresets.string.email();
			expect(email.type).toBe('email');

			const minLength = ValidationPresets.string.minLength(3);
			expect(minLength.type).toBe('minLength');

			const maxLength = ValidationPresets.string.maxLength(10);
			expect(maxLength.type).toBe('maxLength');

			const pattern = ValidationPresets.string.pattern('^[a-z]+$');
			expect(pattern.type).toBe('pattern');

			const url = ValidationPresets.string.url();
			expect(url.type).toBe('url');

			const uuid = ValidationPresets.string.uuid();
			expect(uuid.type).toBe('uuid');

			const cuid = ValidationPresets.string.cuid();
			expect(cuid.type).toBe('cuid');

			const cuid2 = ValidationPresets.string.cuid2();
			expect(cuid2.type).toBe('cuid2');

			const ulid = ValidationPresets.string.ulid();
			expect(ulid.type).toBe('ulid');

			const hex = ValidationPresets.string.hex();
			expect(hex.type).toBe('hex');
		});

		test('should generate number validations', () => {
			const min = ValidationPresets.number.min(5);
			expect(min.type).toBe('min');

			const max = ValidationPresets.number.max(10);
			expect(max.type).toBe('max');
		});

		test('should generate array validations', () => {
			const minItems = ValidationPresets.array.minItems(2);
			expect(minItems.type).toBe('minItems');

			const maxItems = ValidationPresets.array.maxItems(5);
			expect(maxItems.type).toBe('maxItems');

			const nonEmpty = ValidationPresets.array.nonEmpty();
			expect(nonEmpty.type).toBe('minItems');
			expect(nonEmpty.value).toBe(1);
		});

		test('should generate network validations', () => {
			const ipv4 = ValidationPresets.network.ipv4();
			expect(ipv4.type).toBe('ipv4');

			const ipv6 = ValidationPresets.network.ipv6();
			expect(ipv6.type).toBe('ipv6');
		});

		test('should generate date validations', () => {
			const datetime = ValidationPresets.date.datetime();
			expect(datetime.type).toBe('datetime');

			const date = ValidationPresets.date.date();
			expect(date.type).toBe('date');

			const time = ValidationPresets.date.time();
			expect(time.type).toBe('time');
		});

		test('should generate async validations', () => {
			const async = ValidationPresets.custom.async('/api/validate');
			expect(async.type).toBe('async');
			expect(async.url).toBe('/api/validate');
		});
	});

	describe('createZodSchemaFromRules', () => {
		test('should create string schema with required validation', () => {
			const rules = [ValidationPresets.string.required('Field is required')];
			const schema = createZodSchemaFromRules(rules);

			expect(() => schema.parse('test')).not.toThrow();
			expect(() => schema.parse('')).toThrow('Field is required');
			expect(() => schema.parse(undefined)).toThrow('Field is required');
		});

		test('should create email schema', () => {
			const rules = [ValidationPresets.string.email('Invalid email')];
			const schema = createZodSchemaFromRules(rules);

			expect(() => schema.parse('test@example.com')).not.toThrow();
			expect(() => schema.parse('invalid-email')).toThrow('Invalid email');
		});

		test('should create number schema with min validation', () => {
			const rules = [ValidationPresets.number.min(5, 'Minimum 5')];
			const schema = createZodSchemaFromRules(rules);

			expect(() => schema.parse(10)).not.toThrow();
			expect(() => schema.parse(3)).toThrow('Minimum 5');
		});

		test('should create array schema with minItems validation', () => {
			const rules = [ValidationPresets.array.minItems(2, 'Min 2 items')];
			const schema = createZodSchemaFromRules(rules);

			expect(() => schema.parse([1, 2])).not.toThrow();
			expect(() => schema.parse([1])).toThrow('Min 2 items');
		});

		test('should combine multiple validation rules', () => {
			const rules = [
				ValidationPresets.string.required(),
				ValidationPresets.string.minLength(3),
				ValidationPresets.string.email(),
			];
			const schema = createZodSchemaFromRules(rules);

			expect(() => schema.parse('test@example.com')).not.toThrow();
			expect(() => schema.parse('te')).toThrow();
			expect(() => schema.parse('invalid')).toThrow();
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
					name: 'username',
					rules: [ValidationPresets.string.required(), ValidationPresets.string.minLength(3)],
				},
				{
					name: 'email',
					rules: [ValidationPresets.string.email()],
				},
				{
					name: 'age',
					rules: [ValidationPresets.number.min(18)],
				},
			];

			const schema = generateFormSchema(elements as any);
			expect(schema.shape.username).toBeDefined();
			expect(schema.shape.email).toBeDefined();
			expect(schema.shape.age).toBeDefined();

			expect(() =>
				schema.parse({
					username: 'jdoe',
					email: 'john@example.com',
					age: 25,
				}),
			).not.toThrow();

			expect(() =>
				schema.parse({
					username: 'jd',
					email: 'invalid',
					age: 15,
				}),
			).toThrow();
		});

		test('should skip elements without name or validation', () => {
			const elements = [
				{ name: 'valid', rules: [ValidationPresets.string.required()] },
				{ name: '', rules: [ValidationPresets.string.required()] },
				{ name: 'no-rules', rules: [] },
			];

			const schema = generateFormSchema(elements as any);
			expect(schema.shape.valid).toBeDefined();
			expect((schema.shape as any).noRules).toBeUndefined();
		});
	});

	describe('Array Validation', () => {
		test('should create minItems validation rule', () => {
			const rule: MinItemsRule = { type: 'minItems', value: 2, message: 'Min 2 items' };
			const schema = createZodSchemaFromRules([rule]);
			expect(() => schema.parse([1, 2])).not.toThrow();
			expect(() => schema.parse([1])).toThrow('Min 2 items');
		});

		test('should create maxItems validation rule', () => {
			const rule: MaxItemsRule = { type: 'maxItems', value: 2, message: 'Max 2 items' };
			const schema = createZodSchemaFromRules([rule]);
			expect(() => schema.parse([1, 2])).not.toThrow();
			expect(() => schema.parse([1, 2, 3])).toThrow('Max 2 items');
		});

		test('should combine array validation rules', () => {
			const rules: [MinItemsRule, MaxItemsRule] = [
				{ type: 'minItems', value: 2 },
				{ type: 'maxItems', value: 4 },
			];
			const schema = createZodSchemaFromRules(rules);
			expect(() => schema.parse([1, 2])).not.toThrow();
			expect(() => schema.parse([1, 2, 3, 4])).not.toThrow();
			expect(() => schema.parse([1])).toThrow();
			expect(() => schema.parse([1, 2, 3, 4, 5])).toThrow();
		});
	});

	describe('Async Validation', () => {
		test('should create async validation rule with dependencies', () => {
			const rule = ValidationPresets.custom.async('/api/validate', {
				dependencies: ['field1'],
			});
			const schema = createZodSchemaFromRules([rule], { field1: 'value' });
			expect(schema).toBeDefined();
		});

		test('should handle async validation with expected response', () => {
			const rule = ValidationPresets.custom.async('/api/validate', {
				expectedResponse: { valid: true },
			});
			const schema = createZodSchemaFromRules([rule]);
			expect(schema).toBeDefined();
		});

		test('should support cross-field validation structure', () => {
			const rule = ValidationPresets.custom.async('/api/validate', {
				dependencies: ['otherField'],
			});

			const schema = createZodSchemaFromRules([rule], { otherField: 'some value' });
			expect(schema).toBeDefined();
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
				'ipv4',
				'ipv6',
				'datetime',
				'date',
				'time',
				'cuid',
				'cuid2',
				'ulid',
				'hex',
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
