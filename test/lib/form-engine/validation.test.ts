import { test, expect, describe } from 'bun:test';
import {
	ValidationPresets,
	createZodSchema,
	generateFormSchema,
	defaultValidationRegistry,
} from '@/lib/form-engine/validation';

describe('Validation', () => {
	describe('ValidationPresets', () => {
		test('should generate required rule', () => {
			const rule = ValidationPresets.required();
			expect(rule.type).toBe('required');
		});
		test('should generate email rule', () => {
			const rule = ValidationPresets.email();
			expect(rule.type).toBe('email');
		});
		test('should generate minLength rule', () => {
			const rule = ValidationPresets.minLength(3);
			expect(rule.type).toBe('minLength');
			expect(rule.value).toBe(3);
		});
		test('should generate maxLength rule', () => {
			const rule = ValidationPresets.maxLength(10);
			expect(rule.type).toBe('maxLength');
			expect(rule.value).toBe(10);
		});
		test('should generate min rule', () => {
			const rule = ValidationPresets.min(1);
			expect(rule.type).toBe('min');
			expect(rule.value).toBe(1);
		});
		test('should generate max rule', () => {
			const rule = ValidationPresets.max(100);
			expect(rule.type).toBe('max');
			expect(rule.value).toBe(100);
		});
		test('should generate pattern rule', () => {
			const rule = ValidationPresets.pattern('^abc$');
			expect(rule.type).toBe('pattern');
			expect(rule.value).toBe('^abc$');
		});
	});

	describe('createZodSchema', () => {
		test('should create required string schema', () => {
			const rules = [ValidationPresets.required()];
			const schema = createZodSchema('string', rules);
			expect(() => schema.parse('')).toThrow();
			expect(schema.parse('abc')).toBe('abc');
		});
		test('should create minLength string schema', () => {
			const rules = [ValidationPresets.minLength(3)];
			const schema = createZodSchema('string', rules);
			expect(() => schema.parse('ab')).toThrow();
			expect(schema.parse('abc')).toBe('abc');
		});
		test('should create maxLength string schema', () => {
			const rules = [ValidationPresets.maxLength(5)];
			const schema = createZodSchema('string', rules);
			expect(() => schema.parse('abcdef')).toThrow();
			expect(schema.parse('abc')).toBe('abc');
		});
		test('should create min/max number schema', () => {
			const rules = [ValidationPresets.min(1), ValidationPresets.max(10)];
			const schema = createZodSchema('number', rules);
			expect(() => schema.parse(0)).toThrow();
			expect(() => schema.parse(11)).toThrow();
			expect(schema.parse(5)).toBe(5);
		});
		test('should create pattern string schema', () => {
			const rules = [ValidationPresets.pattern('^abc$')];
			const schema = createZodSchema('string', rules);
			expect(() => schema.parse('def')).toThrow();
			expect(schema.parse('abc')).toBe('abc');
		});
	});

	describe('generateFormSchema', () => {
		test('should generate schema for multiple fields', () => {
			const fields = [
				{ name: 'username', type: 'input', validation: [ValidationPresets.required()] },
				{ name: 'age', type: 'number', validation: [ValidationPresets.min(18)] },
			];
			const schema = generateFormSchema(fields);
			expect(() => schema.parse({ username: '', age: 17 })).toThrow();
			expect(schema.parse({ username: 'user', age: 18 })).toEqual({ username: 'user', age: 18 });
		});
	});

	describe('defaultValidationRegistry', () => {
		test('should register and get custom validator', () => {
			defaultValidationRegistry.register('isFoo', (value) => value === 'foo');
			const validator = defaultValidationRegistry.get('isFoo');
			expect(typeof validator).toBe('function');
			if (validator) {
				expect(validator('foo')).toBe(true);
				expect(validator('bar')).toBe(false);
			}
		});
		test('should check if validator exists', () => {
			defaultValidationRegistry.register('isBar', (value) => value === 'bar');
			expect(defaultValidationRegistry.has('isBar')).toBe(true);
			expect(defaultValidationRegistry.has('notExist')).toBe(false);
		});
	});
});
