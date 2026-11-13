import { test, expect, describe } from 'vitest';
import * as z from 'zod/mini';
import {
	collectValidatableFields,
	createValidationContext,
	createZodSchemaFromRules,
	generateFormSchema,
	getValidationRulesForElement,
	createDefaultValidationRegistry,
	ValidationPresets,
	PhoneRuleSchema,
	type MinItemsRule,
	type MaxItemsRule,
} from '../../../src/schemas/validation/';

const validationRegistry = createDefaultValidationRegistry();

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

	describe('built-in rule contracts', () => {
		function parse(rule: { type: string; [key: string]: unknown }, value: unknown) {
			return z.safeParse(createZodSchemaFromRules([rule], createValidationContext(), validationRegistry), value);
		}

		test('required rejects empty arrays while accepting false and zero', () => {
			const required = ValidationPresets.array.required();

			expect(parse(required, []).success).toBe(false);
			expect(parse(ValidationPresets.boolean.required(), false).success).toBe(true);
			expect(parse(ValidationPresets.number.required(), 0).success).toBe(true);
		});

		test('email, URL, UUID, CIDR, phone, and datetime options affect their schemas', () => {
			expect(parse({ type: 'email', pattern: '^x@y\\.com$' }, 'a@b.co').success).toBe(false);
			expect(parse({ type: 'email', pattern: '^x@y\\.com$' }, 'x@y.com').success).toBe(true);

			expect(
				parse({ type: 'url', protocol: '^https$', hostname: '^example\\.com$' }, 'http://example.com').success,
			).toBe(false);
			expect(
				parse({ type: 'url', protocol: '^https$', hostname: '^example\\.com$' }, 'https://example.com').success,
			).toBe(true);
			expect(
				parse({ type: 'url', protocol: '^https$', hostname: '^example\\.com$' }, 'https://other.com').success,
			).toBe(false);

			expect(parse({ type: 'uuid', version: 'v4' }, 'f47ac10b-58cc-11cf-a447-001122334455').success).toBe(false);
			expect(parse({ type: 'uuid', version: 'v4' }, 'f47ac10b-58cc-41cf-a447-001122334455').success).toBe(true);

			expect(parse({ type: 'cidr', version: 'v4' }, '2001:db8::/64').success).toBe(false);
			expect(parse({ type: 'cidr', version: 'v4' }, '192.168.0.0/24').success).toBe(true);
			expect(parse({ type: 'phone' }, '+15555555555').success).toBe(true);
			expect(parse({ type: 'phone' }, 'not-a-phone-number').success).toBe(false);

			expect(parse({ type: 'datetime', local: false }, '2024-01-01T12:00:00').success).toBe(false);
			expect(parse({ type: 'datetime', local: true }, '2024-01-01T12:00:00').success).toBe(true);
		});
	});

	describe('createZodSchemaFromRules', () => {
		test('registers phone validation by default', () => {
			expect(validationRegistry.has('phone')).toBe(true);
		});

		test('injects defaultFor rules onto matching field types', () => {
			const customRegistry = createDefaultValidationRegistry([
				{
					$type: 'phone',
					schema: PhoneRuleSchema,
					metadata: { name: 'Phone' },
					category: 'string',
					defaultFor: ['phone-input'],
					handler: () => z.any(),
				},
			]);

			expect(getValidationRulesForElement({ $type: 'phone-input' }, customRegistry)).toEqual([{ type: 'phone' }]);
			expect(
				getValidationRulesForElement(
					{
						$type: 'phone-input',
						rules: [{ type: 'required', message: 'Phone number is required' }],
					},
					customRegistry,
				),
			).toEqual([{ type: 'required', message: 'Phone number is required' }, { type: 'phone' }]);
			expect(getValidationRulesForElement({ $type: 'input' }, customRegistry)).toBeUndefined();
		});

		test('uses the native IPv4 validator and preserves its configured message', () => {
			const schema = createZodSchemaFromRules(
				[{ type: 'ipv4', message: 'Enter an IPv4 address' }],
				createValidationContext(),
				validationRegistry,
			);

			expect(schema.safeParse('192.168.1.1').success).toBe(true);
			expect(schema.safeParse('256.168.1.1').success).toBe(false);
			expect(schema.safeParse('256.168.1.1').error?.issues[0]?.message).toBe('Enter an IPv4 address');
		});

		test('uses the native IPv6 validator and preserves scoped addresses', () => {
			const schema = createZodSchemaFromRules(
				[{ type: 'ipv6', message: 'Enter an IPv6 address' }],
				createValidationContext(),
				validationRegistry,
			);

			expect(schema.safeParse('2001:db8::1').success).toBe(true);
			expect(schema.safeParse('fe80::1%eth0').success).toBe(true);
			expect(schema.safeParse('2001:db8::1::2').success).toBe(false);
			expect(schema.safeParse('2001:db8::1::2').error?.issues[0]?.message).toBe('Enter an IPv6 address');
			expect(schema.safeParse('fe80::1%').success).toBe(false);
		});

		test('should create string schema with required validation', () => {
			const rules = [ValidationPresets.string.required('Field is required')];
			const schema = createZodSchemaFromRules(rules, createValidationContext(), validationRegistry);

			expect(schema.parse('test')).toBe('test');
			expect(() => schema.parse('')).toThrow('Field is required');
			expect(() => schema.parse(undefined)).toThrow('Field is required');
		});

		test('should create email schema', () => {
			const rules = [ValidationPresets.string.email('Invalid email')];
			const schema = createZodSchemaFromRules(rules, createValidationContext(), validationRegistry);

			expect(schema.parse('test@example.com')).toBe('test@example.com');
			expect(() => schema.parse('invalid-email')).toThrow('Invalid email');
		});

		test('should create number schema with min validation', () => {
			const rules = [ValidationPresets.number.min(5, 'Minimum 5')];
			const schema = createZodSchemaFromRules(rules, createValidationContext(), validationRegistry);

			expect(schema.parse(10)).toBe(10);
			expect(() => schema.parse(3)).toThrow('Minimum 5');
		});

		test('should create array schema with minItems validation', () => {
			const rules = [ValidationPresets.array.minItems(2, 'Min 2 items')];
			const schema = createZodSchemaFromRules(rules, createValidationContext(), validationRegistry);

			expect(schema.parse([1, 2])).toEqual([1, 2]);
			expect(() => schema.parse([1])).toThrow('Min 2 items');
		});

		test('should combine multiple validation rules', () => {
			const rules = [
				ValidationPresets.string.required(),
				ValidationPresets.string.minLength(3),
				ValidationPresets.string.email(),
			];
			const schema = createZodSchemaFromRules(rules, createValidationContext(), validationRegistry);

			expect(schema.parse('test@example.com')).toBe('test@example.com');
			expect(() => schema.parse('te')).toThrow();
			expect(() => schema.parse('invalid')).toThrow();
		});

		test('should handle empty rules array', () => {
			const schema = createZodSchemaFromRules([], createValidationContext(), validationRegistry);
			expect(schema.parse('anything')).toBe('anything');
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

			const schema = generateFormSchema(elements as any, validationRegistry);
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
				{ name: 'valid', rules: [ValidationPresets.string.required()] },
				{ name: '', rules: [ValidationPresets.string.required()] },
				{ name: 'no-rules', rules: [] },
			];

			const schema = generateFormSchema(elements as any, validationRegistry);
			expect('valid' in schema.shape).toBe(true);
			expect((schema.shape as any).noRules).toBeUndefined();
		});
	});

	describe('collectValidatableFields', () => {
		test('collects nested fieldset leaves by composed path', () => {
			const fields = collectValidatableFields(
				[
					{
						name: 'address',
						$type: 'fieldset',
						elements: [
							{ name: 'street', rules: [ValidationPresets.string.required('Street is required')] },
							{ $type: 'note', id: 'hint' },
						],
					},
				],
				'',
				validationRegistry,
			);

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
			const schema = createZodSchemaFromRules([rule], createValidationContext(), validationRegistry);
			expect(schema.parse([1, 2])).toEqual([1, 2]);
			expect(() => schema.parse([1])).toThrow('Min 2 items');
		});

		test('should create maxItems validation rule', () => {
			const rule: MaxItemsRule = { type: 'maxItems', value: 2, message: 'Max 2 items' };
			const schema = createZodSchemaFromRules([rule], createValidationContext(), validationRegistry);
			expect(schema.parse([1, 2])).toEqual([1, 2]);
			expect(() => schema.parse([1, 2, 3])).toThrow('Max 2 items');
		});

		test('should combine array validation rules', () => {
			const rules: [MinItemsRule, MaxItemsRule] = [
				{ type: 'minItems', value: 2 },
				{ type: 'maxItems', value: 4 },
			];
			const schema = createZodSchemaFromRules(rules, createValidationContext(), validationRegistry);
			expect(schema.parse([1, 2])).toEqual([1, 2]);
			expect(schema.parse([1, 2, 3, 4])).toEqual([1, 2, 3, 4]);
			expect(() => schema.parse([1])).toThrow();
			expect(() => schema.parse([1, 2, 3, 4, 5])).toThrow();
		});
	});

	describe('Async Validation', () => {
		test('should create async validation rule with dependencies', () => {
			const rule = ValidationPresets.custom.async('/api/validate', {
				dependencies: ['field1'],
			});
			const schema = createZodSchemaFromRules(
				[rule],
				createValidationContext({ values: { field1: 'value' } }),
				validationRegistry,
			);
			expect(schema).toBeDefined();
		});

		test('should handle async validation with expected response', () => {
			const rule = ValidationPresets.custom.async('/api/validate', {
				expectedResponse: { valid: true },
			});
			const schema = createZodSchemaFromRules([rule], createValidationContext(), validationRegistry);
			expect(schema).toBeDefined();
		});

		test('should support cross-field validation structure', () => {
			const rule = ValidationPresets.custom.async('/api/validate', {
				dependencies: ['otherField'],
			});

			const schema = createZodSchemaFromRules(
				[rule],
				createValidationContext({ values: { otherField: 'some value' } }),
				validationRegistry,
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
