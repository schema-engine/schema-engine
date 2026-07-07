import { z } from 'zod';
import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { ValidationRegistry, ValidationPresets } from '../../../src/schemas/validation/validation-registry';
import type { ValidationRegistration } from '../../../src/schemas/validation/types';

describe('ValidationRegistry', () => {
	let registry: ValidationRegistry;

	beforeEach(() => {
		registry = new ValidationRegistry();
	});

	describe('Basic Registration', () => {
		it('should register a custom validation type', () => {
			const customValidation: ValidationRegistration = {
				type: 'custom',
				category: 'generic',
				handler: (rule: { type: string; message?: string }) => z.string().min(5, rule.message),
			};

			registry.register(customValidation);
			expect(registry.has('custom')).toBe(true);

			const registration = registry.get('custom' as any);
			expect(registration?.type).toBe('custom');
		});

		it('should allow bulk registration', () => {
			const registrations: ValidationRegistration<any>[] = [
				{
					type: 'v1',
					category: 'generic',
					handler: () => z.string(),
				},
				{
					type: 'v2',
					category: 'generic',
					handler: () => z.number(),
				},
			];

			registry.registerMultiple(registrations);
			expect(registry.has('v1')).toBe(true);
			expect(registry.has('v2')).toBe(true);
		});

		it('should get validations by category', () => {
			registry.registerMultiple([
				{ type: 's1', category: 'string', handler: () => z.string() },
				{ type: 's2', category: 'string', handler: () => z.string() },
				{ type: 'n1', category: 'number', handler: () => z.number() },
			]);

			const stringValidations = registry.getByCategory('string');
			expect(stringValidations).toHaveLength(2);
			expect(stringValidations.every((v) => v.category === 'string')).toBe(true);
		});

		it('should unregister validation types', () => {
			registry.register({ type: 'temp', category: 'generic', handler: () => z.any() });
			expect(registry.has('temp')).toBe(true);

			registry.unregister('temp');
			expect(registry.has('temp')).toBe(false);
		});
	});

	describe('Built-in Validations', () => {
		// Use the global registry which should be pre-populated
		const { validationRegistry: globalRegistry } = require('../../../src/schemas/validation/validation-registry');

		it('should have all required built-in validation types', () => {
			const types = globalRegistry.getRegisteredTypes();
			expect(types).toContain('required');
			expect(types).toContain('email');
			expect(types).toContain('minLength');
			expect(types).toContain('maxLength');
			expect(types).toContain('min');
			expect(types).toContain('max');
		});

		it('should create schemas for string validations', () => {
			const requiredSchema = globalRegistry.createSchema({ type: 'required', message: 'Required field' });
			expect(requiredSchema?.parse('data')).toBe('data');
			expect(() => requiredSchema?.parse('')).toThrow();

			const emailSchema = globalRegistry.createSchema({ type: 'email' });
			expect(emailSchema?.parse('test@example.com')).toBe('test@example.com');
			expect(() => emailSchema?.parse('invalid')).toThrow();
		});

		it('should create schemas for number validations', () => {
			const minSchema = globalRegistry.createSchema({ type: 'min', value: 10 });
			expect(minSchema?.parse(15)).toBe(15);
			expect(() => minSchema?.parse(5)).toThrow();
		});

		it('should create schemas for array validations', () => {
			const minItemsSchema = globalRegistry.createSchema({ type: 'minItems', value: 2 });
			expect(minItemsSchema?.parse([1, 2])).toEqual([1, 2]);
			expect(() => minItemsSchema?.parse([1])).toThrow();
		});
	});

	describe('Presets', () => {
		it('should provide string presets', () => {
			const rule = ValidationPresets.string.required('Required');
			expect(rule).toEqual({ type: 'required', message: 'Required' });

			const emailRule = ValidationPresets.string.email();
			expect(emailRule.type).toBe('email');
		});

		it('should provide number presets', () => {
			const minRule = ValidationPresets.number.min(5);
			expect(minRule).toEqual({ type: 'min', value: 5, message: 'Must be at least 5' });
		});

		it('should provide array presets', () => {
			const minItemsRule = ValidationPresets.array.minItems(3);
			expect(minItemsRule).toEqual({ type: 'minItems', value: 3, message: 'Must have at least 3 items' });
		});

		it('should provide async presets with dependencies', () => {
			const asyncRule = ValidationPresets.custom.async('/api/check', { dependencies: ['otherField'] });
			expect(asyncRule.type).toBe('async');
			expect(asyncRule.dependencies).toEqual(['otherField']);
		});
	});

	describe('Async Validation', () => {
		const { validationRegistry: globalRegistry } = require('../../../src/schemas/validation/validation-registry');

		it('should create async validation schema', () => {
			const rule = { type: 'async', url: '/api/validate' };
			const schema = globalRegistry.createSchema(rule);
			expect(schema).toBeDefined();
		});

		it('should include dependencies in async validation rule', () => {
			const rule = {
				type: 'async',
				url: '/api/validate',
				dependencies: ['field1', 'field2'],
			};
			const schema = globalRegistry.createSchema(rule, { field1: 'val1', field2: 'val2' });
			expect(schema).toBeDefined();
		});
	});

	describe('Custom Validations', () => {
		it('should support credit card validation pattern', () => {
			/**
			 * Register a custom credit card validation using Luhn algorithm
			 * @see https://en.wikipedia.org/wiki/Luhn_algorithm
			 */
			const creditCardValidation: ValidationRegistration = {
				type: 'creditCard',
				category: 'string',
				handler: (rule: { type: string; message?: string }) => {
					return z.string().refine((value) => {
						const digits = value.replace(/\s/g, '');
						if (!/^\d+$/.test(digits)) return false;

						let sum = 0;
						let shouldDouble = false;

						for (let i = digits.length - 1; i >= 0; i--) {
							let digit = parseInt(digits[i], 10);
							if (shouldDouble) {
								digit *= 2;
								if (digit > 9) digit -= 9;
							}
							sum += digit;
							shouldDouble = !shouldDouble;
						}

						return sum % 10 === 0;
					}, rule.message || 'Invalid credit card number');
				},
			};

			registry.register(creditCardValidation);

			const rule = { type: 'creditCard', message: 'Invalid card' };
			const schema = registry.createSchema(rule);

			expect(schema).toBeDefined();
			expect(() => schema?.parse('4532015112830366')).not.toThrow();
			expect(() => schema?.parse('1234567890')).toThrow();
			expect(() => schema?.parse('4532 0151 1283 0366')).not.toThrow();
		});

		it('should support phone number validation', () => {
			const phoneValidation: ValidationRegistration = {
				type: 'phone',
				category: 'string',
				handler: (rule: { type: string; message?: string }) => {
					const phoneRegex = /^\+?[1-9]\d{1,14}$/;
					return z.string().regex(phoneRegex, rule.message || 'Invalid phone number');
				},
			};

			registry.register(phoneValidation);

			const phoneRule = { type: 'phone', message: 'Invalid phone format' };
			const schema = registry.createSchema(phoneRule);

			expect(schema).toBeDefined();
			expect(() => schema?.parse('+1234567890')).not.toThrow();
			expect(() => schema?.parse('invalid')).toThrow();
		});
	});

	describe('Error Handling', () => {
		it('should return null for unregistered validation types', () => {
			const schema = registry.createSchema({ type: 'nonexistent' });
			expect(schema).toBeNull();
		});

		it('should handle errors in validation handlers gracefully', () => {
			const faultyValidation: ValidationRegistration = {
				type: 'faulty',
				category: 'generic',
				handler: () => {
					throw new Error('Validation handler error');
				},
			};

			registry.register(faultyValidation);

			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const schema = registry.createSchema({ type: 'faulty' });

			expect(schema).toBeNull();
			expect(consoleErrorSpy).toHaveBeenCalled();
			consoleErrorSpy.mockRestore();
		});

		it('should warn when overriding existing validation types', () => {
			const v1: ValidationRegistration = { type: 'test', category: 'generic', handler: () => z.string() };
			const v2: ValidationRegistration = { type: 'test', category: 'generic', handler: () => z.number() };

			registry.register(v1);
			registry.register(v2);

			const schema = registry.createSchema({ type: 'test' });
			expect(schema?.parse(123)).toBe(123);
		});
	});
});
