import { test, expect, describe } from 'vitest';
import * as z from 'zod/mini';
import {
	collectValidatableFields,
	createValidationContext,
	createZodSchemaFromRules,
	generateFormSchema,
	getValidationRulesForElement,
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

			const maxLength = validationRegistry.presets.string.maxLength(10);
			expect(maxLength.type).toBe('maxLength');

			const pattern = validationRegistry.presets.string.pattern('^[a-z]+$');
			expect(pattern.type).toBe('pattern');

			const url = validationRegistry.presets.string.url();
			expect(url.type).toBe('url');

			const uuid = validationRegistry.presets.string.uuid();
			expect(uuid.type).toBe('uuid');

			const cuid = validationRegistry.presets.string.cuid();
			expect(cuid.type).toBe('cuid');

			const cuid2 = validationRegistry.presets.string.cuid2();
			expect(cuid2.type).toBe('cuid2');

			const ulid = validationRegistry.presets.string.ulid();
			expect(ulid.type).toBe('ulid');

			const hex = validationRegistry.presets.string.hex();
			expect(hex.type).toBe('hex');
		});

		test('should generate number validations', () => {
			const min = validationRegistry.presets.number.min(5);
			expect(min.type).toBe('min');

			const max = validationRegistry.presets.number.max(10);
			expect(max.type).toBe('max');
		});

		test('should generate array validations', () => {
			const minItems = validationRegistry.presets.array.minItems(2);
			expect(minItems.type).toBe('minItems');

			const maxItems = validationRegistry.presets.array.maxItems(5);
			expect(maxItems.type).toBe('maxItems');

			const nonEmpty = validationRegistry.presets.array.nonEmpty();
			expect(nonEmpty.type).toBe('minItems');
			expect(nonEmpty.value).toBe(1);
		});

		test('should generate network validations', () => {
			const ipv4 = validationRegistry.presets.network.ipv4();
			expect(ipv4.type).toBe('ipv4');

			const ipv6 = validationRegistry.presets.network.ipv6();
			expect(ipv6.type).toBe('ipv6');
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
			const async = validationRegistry.presets.custom.async('/api/validate');
			expect(async.type).toBe('async');
			expect(async.url).toBe('/api/validate');
		});
	});

	describe('createZodSchemaFromRules', () => {
		test('does not register phone validation by default', () => {
			expect(validationRegistry.has('phone')).toBe(false);
		});

		test('injects defaultFor rules onto matching field types', () => {
			validationRegistry.register({
				type: 'phone',
				category: 'string',
				defaultFor: ['phone-input'],
				handler: () => z.any(),
			});

			try {
				expect(getValidationRulesForElement({ $type: 'phone-input' })).toEqual([{ type: 'phone' }]);
				expect(
					getValidationRulesForElement({
						$type: 'phone-input',
						rules: [{ type: 'required', message: 'Phone number is required' }],
					}),
				).toEqual([{ type: 'required', message: 'Phone number is required' }, { type: 'phone' }]);
				expect(getValidationRulesForElement({ $type: 'input' })).toBeUndefined();
			} finally {
				validationRegistry.unregister('phone');
			}
		});

		test('uses the native IPv4 validator and preserves its configured message', () => {
			const schema = createZodSchemaFromRules(
				[{ type: 'ipv4', message: 'Enter an IPv4 address' }],
				createValidationContext(),
			);

			expect(schema.safeParse('192.168.1.1').success).toBe(true);
			expect(schema.safeParse('256.168.1.1').success).toBe(false);
			expect(schema.safeParse('256.168.1.1').error?.issues[0]?.message).toBe('Enter an IPv4 address');
		});

		test('uses the native IPv6 validator and preserves scoped addresses', () => {
			const schema = createZodSchemaFromRules(
				[{ type: 'ipv6', message: 'Enter an IPv6 address' }],
				createValidationContext(),
			);

			expect(schema.safeParse('2001:db8::1').success).toBe(true);
			expect(schema.safeParse('fe80::1%eth0').success).toBe(true);
			expect(schema.safeParse('2001:db8::1::2').success).toBe(false);
			expect(schema.safeParse('2001:db8::1::2').error?.issues[0]?.message).toBe('Enter an IPv6 address');
			expect(schema.safeParse('fe80::1%').success).toBe(false);
		});

		test('should create string schema with required validation', () => {
			const rules = [validationRegistry.presets.string.required('Field is required')];
			const schema = createZodSchemaFromRules(rules, createValidationContext());

			expect(schema.parse('test')).toBe('test');
			expect(() => schema.parse('')).toThrow('Field is required');
			expect(() => schema.parse(undefined)).toThrow('Field is required');
		});

		test('should create email schema', () => {
			const rules = [validationRegistry.presets.string.email('Invalid email')];
			const schema = createZodSchemaFromRules(rules, createValidationContext());

			expect(schema.parse('test@example.com')).toBe('test@example.com');
			expect(() => schema.parse('invalid-email')).toThrow('Invalid email');
		});

		test('should create number schema with min validation', () => {
			const rules = [validationRegistry.presets.number.min(5, 'Minimum 5')];
			const schema = createZodSchemaFromRules(rules, createValidationContext());

			expect(schema.parse(10)).toBe(10);
			expect(() => schema.parse(3)).toThrow('Minimum 5');
		});

		test('should create array schema with minItems validation', () => {
			const rules = [validationRegistry.presets.array.minItems(2, 'Min 2 items')];
			const schema = createZodSchemaFromRules(rules, createValidationContext());

			expect(schema.parse([1, 2])).toEqual([1, 2]);
			expect(() => schema.parse([1])).toThrow('Min 2 items');
		});

		test('should combine multiple validation rules', () => {
			const rules = [
				validationRegistry.presets.string.required(),
				validationRegistry.presets.string.minLength(3),
				validationRegistry.presets.string.email(),
			];
			const schema = createZodSchemaFromRules(rules, createValidationContext());

			expect(schema.parse('test@example.com')).toBe('test@example.com');
			expect(() => schema.parse('te')).toThrow();
			expect(() => schema.parse('invalid')).toThrow();
		});

		test('should handle empty rules array', () => {
			const schema = createZodSchemaFromRules([], createValidationContext());
			expect(schema.parse('anything')).toBe('anything');
		});
	});

	describe('generateFormSchema', () => {
		test('should generate form schema from elements', () => {
			const elements = [
				{
					name: 'username',
					rules: [
						validationRegistry.presets.string.required(),
						validationRegistry.presets.string.minLength(3),
					],
				},
				{
					name: 'email',
					rules: [validationRegistry.presets.string.email()],
				},
				{
					name: 'age',
					rules: [validationRegistry.presets.number.min(18)],
				},
			];

			const schema = generateFormSchema(elements as any);
			expect(Object.keys(schema.shape).sort()).toEqual(['age', 'email', 'username']);

			expect(
				schema.parse({
					username: 'jdoe',
					email: 'john@example.com',
					age: 25,
				}),
			).toEqual({
				username: 'jdoe',
				email: 'john@example.com',
				age: 25,
			});

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
				{ name: 'valid', rules: [validationRegistry.presets.string.required()] },
				{ name: '', rules: [validationRegistry.presets.string.required()] },
				{ name: 'no-rules', rules: [] },
			];

			const schema = generateFormSchema(elements as any);
			expect('valid' in schema.shape).toBe(true);
			expect((schema.shape as any).noRules).toBeUndefined();
		});
	});

	describe('collectValidatableFields', () => {
		test('collects nested fieldset leaves by composed path', () => {
			const fields = collectValidatableFields([
				{
					name: 'address',
					$type: 'fieldset',
					elements: [
						{ name: 'street', rules: [validationRegistry.presets.string.required('Street is required')] },
						{ $type: 'note', id: 'hint' },
					],
				},
			]);

			expect(fields).toEqual([
				{
					path: 'address.street',
					rules: [{ type: 'required', message: 'Street is required' }],
				},
			]);
		});
	});

	describe('Array Validation', () => {
		test('should create minItems validation rule', () => {
			const rule: MinItemsRule = { type: 'minItems', value: 2, message: 'Min 2 items' };
			const schema = createZodSchemaFromRules([rule], createValidationContext());
			expect(schema.parse([1, 2])).toEqual([1, 2]);
			expect(() => schema.parse([1])).toThrow('Min 2 items');
		});

		test('should create maxItems validation rule', () => {
			const rule: MaxItemsRule = { type: 'maxItems', value: 2, message: 'Max 2 items' };
			const schema = createZodSchemaFromRules([rule], createValidationContext());
			expect(schema.parse([1, 2])).toEqual([1, 2]);
			expect(() => schema.parse([1, 2, 3])).toThrow('Max 2 items');
		});

		test('should combine array validation rules', () => {
			const rules: [MinItemsRule, MaxItemsRule] = [
				{ type: 'minItems', value: 2 },
				{ type: 'maxItems', value: 4 },
			];
			const schema = createZodSchemaFromRules(rules, createValidationContext());
			expect(schema.parse([1, 2])).toEqual([1, 2]);
			expect(schema.parse([1, 2, 3, 4])).toEqual([1, 2, 3, 4]);
			expect(() => schema.parse([1])).toThrow();
			expect(() => schema.parse([1, 2, 3, 4, 5])).toThrow();
		});
	});

	describe('Async Validation', () => {
		test('should create async validation rule with dependencies', () => {
			const rule = validationRegistry.presets.custom.async('/api/validate', {
				dependencies: ['field1'],
			});
			const schema = createZodSchemaFromRules([rule], createValidationContext({ values: { field1: 'value' } }));
			expect(schema).toBeDefined();
		});

		test('should handle async validation with expected response', () => {
			const rule = validationRegistry.presets.custom.async('/api/validate', {
				expectedResponse: { valid: true },
			});
			const schema = createZodSchemaFromRules([rule], createValidationContext());
			expect(schema).toBeDefined();
		});

		test('should support cross-field validation structure', () => {
			const rule = validationRegistry.presets.custom.async('/api/validate', {
				dependencies: ['otherField'],
			});

			const schema = createZodSchemaFromRules(
				[rule],
				createValidationContext({ values: { otherField: 'some value' } }),
			);
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
