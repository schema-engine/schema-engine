import { describe, expect, it, beforeEach, mock } from 'bun:test';
import { z } from 'zod';
import { ValidationRegistry, type ValidationRegistration } from '../../../src/schemas/validation/';
import type { AsyncRule, ValidationRule, BaseValidationRule } from '../../../src/schemas/validation/';

describe('ValidationRegistry', () => {
	let registry: ValidationRegistry;

	beforeEach(() => {
		registry = new ValidationRegistry();
	});

	describe('Basic Registration', () => {
		it('should register a custom validation type', () => {
			const customValidation: ValidationRegistration = {
				type: 'custom-test',
				category: 'string',
				handler: (rule: ValidationRule) => z.string().min(5, rule.message || 'Too short'),
			};

			registry.register(customValidation);
			
			expect(registry.has('custom-test')).toBe(true);
			expect(registry.getRegisteredTypes()).toContain('custom-test');
		});

		it('should allow bulk registration', () => {
			const validations: ValidationRegistration[] = [
				{
					type: 'bulk-test-1',
					category: 'string',
					handler: (rule: ValidationRule) => z.string(),
				},
				{
					type: 'bulk-test-2',
					category: 'number',
					handler: (rule: ValidationRule) => z.number(),
				},
			];

			registry.registerMultiple(validations);
			
			expect(registry.has('bulk-test-1')).toBe(true);
			expect(registry.has('bulk-test-2')).toBe(true);
		});

		it('should get validations by category', () => {
			const stringValidations = registry.getByCategory('string');
			const numberValidations = registry.getByCategory('number');
			
			expect(stringValidations.length).toBeGreaterThan(0);
			expect(numberValidations.length).toBeGreaterThan(0);
			
			for (const validation of stringValidations) {
				expect(validation.category).toBe('string');
			}
		});

		it('should unregister validation types', () => {
			const customValidation: ValidationRegistration = {
				type: 'temp-validation',
				category: 'generic',
				handler: (rule: ValidationRule) => z.any(),
			};

			registry.register(customValidation);
			expect(registry.has('temp-validation')).toBe(true);
			
			const unregistered = registry.unregister('temp-validation');
			expect(unregistered).toBe(true);
			expect(registry.has('temp-validation')).toBe(false);
		});
	});

	describe('Built-in Validations', () => {
		it('should have all required built-in validation types', () => {
			const requiredTypes = [
				'required', 'email', 'minLength', 'maxLength', 'pattern', 
				'url', 'uuid', 'min', 'max', 'minItems', 'maxItems',
				'ip', 'datetime', 'date', 'time', 'async'
			];

			for (const type of requiredTypes) {
				expect(registry.has(type)).toBe(true);
			}
		});

		it('should create schemas for string validations', () => {
			const emailRule: ValidationRule = { type: 'email', message: 'Invalid email' };
			const schema = registry.createSchema(emailRule);
			
			expect(schema).toBeDefined();
			expect(() => schema?.parse('test@example.com')).not.toThrow();
			expect(() => schema?.parse('invalid-email')).toThrow();
		});

		it('should create schemas for number validations', () => {
			const minRule: ValidationRule = { 
				type: 'min', 
				value: 10, 
				message: 'Must be at least 10' 
			} as any;
			const schema = registry.createSchema(minRule);
			
			expect(schema).toBeDefined();
			expect(() => schema?.parse(15)).not.toThrow();
			expect(() => schema?.parse(5)).toThrow();
		});

		it('should create schemas for array validations', () => {
			const minItemsRule: ValidationRule = { 
				type: 'minItems', 
				value: 2, 
				message: 'Must have at least 2 items' 
			} as any;
			const schema = registry.createSchema(minItemsRule);
			
			expect(schema).toBeDefined();
			expect(() => schema?.parse([1, 2, 3])).not.toThrow();
			expect(() => schema?.parse([1])).toThrow();
		});
	});

	describe('Presets', () => {
		it('should provide string presets', () => {
			const required = registry.presets.string.required('Field is required');
			const email = registry.presets.string.email();
			const minLength = registry.presets.string.minLength(5, 'Too short');
			
			expect(required).toEqual({ type: 'required', message: 'Field is required' });
			expect(email.type).toBe('email');
			expect(minLength).toEqual({ type: 'minLength', value: 5, message: 'Too short' });
		});

		it('should provide number presets', () => {
			const min = registry.presets.number.min(10);
			const max = registry.presets.number.max(100, 'Too large');
			
			expect(min.type).toBe('min');
			expect(min.value).toBe(10);
			expect(max).toEqual({ type: 'max', value: 100, message: 'Too large' });
		});

		it('should provide array presets', () => {
			const minItems = registry.presets.array.minItems(2);
			const nonEmpty = registry.presets.array.nonEmpty('Cannot be empty');
			
			expect(minItems.type).toBe('minItems');
			expect(nonEmpty).toEqual({ type: 'minItems', value: 1, message: 'Cannot be empty' });
		});

		it('should provide async presets with dependencies', () => {
			const asyncRule = registry.presets.custom.async('/api/validate', {
				dependencies: ['field1', 'field2'],
				message: 'Validation failed',
				method: 'POST',
			});
			
			expect(asyncRule.type).toBe('async');
			expect(asyncRule.url).toBe('/api/validate');
			expect(asyncRule.dependencies).toEqual(['field1', 'field2']);
			expect(asyncRule.method).toBe('POST');
		});
	});

	describe('Async Validation', () => {
		const mockFetch = mock(() => Promise.resolve({
			ok: true,
			json: () => Promise.resolve({ valid: true })
		}));

		beforeEach(() => {
			global.fetch = mockFetch as any;
		});

		it('should create async validation schema', async () => {
			const asyncRule: AsyncRule = {
				type: 'async',
				url: '/api/validate',
				method: 'POST',
				message: 'Async validation failed',
			};

			const schema = registry.createSchema(asyncRule);
			expect(schema).toBeDefined();
		});

		it('should include dependencies in async validation rule', () => {
			const asyncRule = registry.presets.custom.async('/api/validate-cross-field', {
				dependencies: ['age', 'category'],
				body: { validationType: 'cross-field' },
				expectedResponse: { valid: true },
			});

			expect(asyncRule.dependencies).toEqual(['age', 'category']);
			expect(asyncRule.body).toEqual({ validationType: 'cross-field' });
			expect(asyncRule.expectedResponse).toEqual({ valid: true });
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
				handler: (rule: ValidationRule) => {
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
				handler: (rule: ValidationRule) => {
					const phoneRegex = /^\+?[1-9]\d{1,14}$/;
					return z.string().regex(phoneRegex, rule.message || 'Invalid phone number');
				},
			};

			registry.register(phoneValidation);
			
			const phoneRule = { type: 'phone', message: 'Invalid phone format' };
			const schema = registry.createSchema(phoneRule);
					
			expect(schema).toBeDefined();
			expect(() => schema?.parse('+1234567890')).not.toThrow();
			expect(() => schema?.parse('invalid-phone')).toThrow();
			expect(() => schema?.parse('+0123456789')).toThrow();
		});
	});

	describe('Error Handling', () => {
		it('should return null for unregistered validation types', () => {
			const rule: BaseValidationRule = { type: 'nonexistent' };
			const schema = registry.createSchema(rule);
			
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
			
			const rule: BaseValidationRule = { type: 'faulty' };
			const schema = registry.createSchema(rule);
			
			expect(schema).toBeNull();
		});

		it('should warn when overriding existing validation types', () => {
			const consoleSpy = mock(() => {});
			console.warn = consoleSpy;

			const validation1: ValidationRegistration = {
				type: 'duplicate-test',
				category: 'string',
				handler: () => z.string(),
			};

			const validation2: ValidationRegistration = {
				type: 'duplicate-test',
				category: 'number',
				handler: () => z.number(),
			};

			registry.register(validation1);
			registry.register(validation2);

			expect(consoleSpy).toHaveBeenCalledWith(
				"Validation type 'duplicate-test' is already registered. Overriding."
			);
		});
	});
});