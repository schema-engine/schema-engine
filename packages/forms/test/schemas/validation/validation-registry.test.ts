import * as z from 'zod/mini';
import { describe, it, expect, vi } from 'vitest';
import {
	createDefaultValidationRegistry,
	createValidationRegistry,
} from '../../../src/schemas/validation/validation-registry';
import { ValidationPresets } from '../../../src/schemas/validation/presets';

const globalRegistry = createDefaultValidationRegistry();
import type { AnyValidationRegistration, ValidationRegistration } from '../../../src/schemas/validation/types';
import { createValidationContext } from '../../../src/schemas/validation/utils';
import { logger } from '../../../src/lib/logger';

const looseRule = z.looseObject({ type: z.string(), message: z.optional(z.string()) });

/** A registration with the shared shape filled in, for tests that only care about the handler. */
function registration($type: string, rest: Partial<ValidationRegistration> = {}): ValidationRegistration {
	return {
		$type,
		schema: looseRule,
		metadata: { name: $type },
		category: 'generic',
		handler: () => z.unknown(),
		...rest,
	};
}

describe('ValidationRegistry', () => {
	describe('Basic Registration', () => {
		it('should store a custom validation type', () => {
			const registry = createValidationRegistry([
				registration('custom', {
					handler: (rule: { type: string; message?: string }) =>
						z.string().check(z.minLength(5, rule.message)),
				}),
			]);
			expect(registry.has('custom')).toBe(true);
			expect(registry.get('custom')?.$type).toBe('custom');
		});

		it('should build from a list of registrations', () => {
			const registrations: ValidationRegistration<any>[] = [
				registration('v1', { handler: () => z.string() }),
				registration('v2', { handler: () => z.number() }),
			];

			const registry = createValidationRegistry(registrations);
			expect(registry.has('v1')).toBe(true);
			expect(registry.has('v2')).toBe(true);
			expect(registry.keys()).toEqual(['v1', 'v2']);
		});

		it('should get validations by category', () => {
			const registry = createValidationRegistry([
				registration('s1', { category: 'string' }),
				registration('s2', { category: 'string' }),
				registration('n1', { category: 'number' }),
			]);

			const stringValidations = registry.getByCategory('string');
			expect(stringValidations).toHaveLength(2);
			expect(stringValidations.every((v) => v.category === 'string')).toBe(true);
		});

		it('has no way to register, unregister or clear after it is built', () => {
			const registry = createValidationRegistry([registration('temp')]);

			expect(registry).not.toHaveProperty('register');
			expect(registry).not.toHaveProperty('registerMultiple');
			expect(registry).not.toHaveProperty('unregister');
			expect(registry).not.toHaveProperty('clear');
			expect(Object.isFrozen(registry)).toBe(true);
		});

		it('throws naming the type when a schema is not a Standard Schema', () => {
			expect(() =>
				createValidationRegistry([
					{ ...registration('broken'), schema: {} } as unknown as AnyValidationRegistration,
				]),
			).toThrow("Validation 'broken' schema must implement Standard Schema");
		});
	});

	describe('Built-in Validations', () => {
		it('should have all required built-in validation types', () => {
			const types = globalRegistry.keys();
			expect(types).toContain('required');
			expect(types).toContain('email');
			expect(types).toContain('minLength');
			expect(types).toContain('maxLength');
			expect(types).toContain('min');
			expect(types).toContain('max');
		});

		it('should create schemas for string validations', () => {
			const requiredSchema = globalRegistry.createSchema(
				{ type: 'required', message: 'Required field' },
				createValidationContext(),
			);
			expect(requiredSchema?.parse('data')).toBe('data');
			expect(() => requiredSchema?.parse('')).toThrow();

			const emailSchema = globalRegistry.createSchema({ type: 'email' }, createValidationContext());
			expect(emailSchema?.parse('test@example.com')).toBe('test@example.com');
			expect(() => emailSchema?.parse('invalid')).toThrow();
		});

		it('should create schemas for number validations', () => {
			const minSchema = globalRegistry.createSchema({ type: 'min', value: 10 }, createValidationContext());
			expect(minSchema?.parse(15)).toBe(15);
			expect(() => minSchema?.parse(5)).toThrow();
		});

		it('should create schemas for array validations', () => {
			const minItemsSchema = globalRegistry.createSchema(
				{ type: 'minItems', value: 2 },
				createValidationContext(),
			);
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

		it('builds rule config only: a message appears only when the caller passes one', () => {
			const rules = [
				ValidationPresets.string.email(),
				ValidationPresets.string.minLength(3),
				ValidationPresets.string.pattern('a'),
				ValidationPresets.array.nonEmpty(),
				ValidationPresets.network.ipv4(),
				ValidationPresets.date.date(),
				ValidationPresets.custom.async('/api/check'),
			];

			expect(rules.filter((rule) => rule.message !== undefined)).toEqual([]);
		});

		it('should provide number presets', () => {
			const minRule = ValidationPresets.number.min(5);
			expect(minRule).toEqual({ type: 'min', value: 5 });
			expect(ValidationPresets.number.min(5, 'At least five')).toEqual({
				type: 'min',
				value: 5,
				message: 'At least five',
			});
		});

		it('should provide array presets', () => {
			const minItemsRule = ValidationPresets.array.minItems(3);
			expect(minItemsRule).toEqual({ type: 'minItems', value: 3 });
		});

		it('should provide async presets with dependencies', () => {
			const asyncRule = ValidationPresets.custom.async('/api/check', { dependencies: ['otherField'] });
			expect(asyncRule.type).toBe('async');
			expect(asyncRule.dependencies).toEqual(['otherField']);
		});
	});

	describe('Async Validation', () => {
		it('should create async validation schema', () => {
			const rule = { type: 'async', url: '/api/validate' };
			const schema = globalRegistry.createSchema(rule, createValidationContext());
			expect(schema).toBeDefined();
		});

		it('should include dependencies in async validation rule', () => {
			const rule = {
				type: 'async',
				url: '/api/validate',
				dependencies: ['field1', 'field2'],
			};
			const schema = globalRegistry.createSchema(
				rule,
				createValidationContext({ values: { field1: 'val1', field2: 'val2' } }),
			);
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
				...registration('creditCard', { category: 'string' }),
				handler: (rule: { type: string; message?: string }) => {
					return z.string().check(
						z.refine((value) => {
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
						}, rule.message || 'Invalid credit card number'),
					);
				},
			};

			const registry = createValidationRegistry([creditCardValidation]);

			const rule = { type: 'creditCard', message: 'Invalid card' };
			const schema = registry.createSchema(rule, createValidationContext());

			expect(schema).toBeDefined();
			expect(() => schema?.parse('4532015112830366')).not.toThrow();
			expect(() => schema?.parse('1234567890')).toThrow();
			expect(() => schema?.parse('4532 0151 1283 0366')).not.toThrow();
		});

		it('should support phone number validation', () => {
			const phoneValidation: ValidationRegistration = {
				...registration('phone', { category: 'string' }),
				handler: (rule: { type: string; message?: string }) => {
					const phoneRegex = /^\+?[1-9]\d{1,14}$/;
					return z.string().check(z.regex(phoneRegex, rule.message || 'Invalid phone number'));
				},
			};

			const registry = createValidationRegistry([phoneValidation]);

			const phoneRule = { type: 'phone', message: 'Invalid phone format' };
			const schema = registry.createSchema(phoneRule, createValidationContext());

			expect(schema).toBeDefined();
			expect(() => schema?.parse('+1234567890')).not.toThrow();
			expect(() => schema?.parse('invalid')).toThrow();
		});

		it('derives defaultFor rules for matching field types at build', () => {
			const registry = createValidationRegistry([
				registration('phone', { category: 'string', defaultFor: ['phone-input'], handler: () => z.string() }),
			]);

			expect(registry.getDefaultRulesForFieldType('phone-input')).toEqual([{ type: 'phone' }]);
			expect(registry.getDefaultRulesForFieldType('input')).toEqual([]);
		});

		it('drops the defaultFor rules of a registration that a later one replaces', () => {
			const registry = createValidationRegistry([
				registration('phone', { category: 'string', defaultFor: ['phone-input'], handler: () => z.string() }),
				registration('phone', { category: 'string', handler: () => z.string() }),
			]);

			expect(registry.getDefaultRulesForFieldType('phone-input')).toEqual([]);
		});
	});

	describe('Error Handling', () => {
		it('throws, naming the type, for an unregistered validation type', () => {
			expect(() =>
				createValidationRegistry([]).createSchema({ type: 'nonexistent' }, createValidationContext()),
			).toThrow(expect.objectContaining({ name: 'ValidationRuleError', ruleType: 'nonexistent' }));
		});

		it('throws, keeping the cause, when a handler cannot build the rule', () => {
			const registry = createValidationRegistry([
				registration('faulty', {
					handler: () => {
						throw new Error('Validation handler error');
					},
				}),
			]);

			expect(() => registry.createSchema({ type: 'faulty' }, createValidationContext())).toThrow(
				expect.objectContaining({ ruleType: 'faulty', cause: new Error('Validation handler error') }),
			);
		});

		it('says why a rule cannot be used, or nothing when it can', () => {
			const registry = createValidationRegistry([
				registration('faulty', {
					handler: () => {
						throw new Error('no good');
					},
				}),
				registration('fine', { handler: () => z.string() }),
			]);

			expect(registry.check({ type: 'fine' })).toEqual({ ok: true, rule: { type: 'fine' } });
			expect(registry.check({ type: 'nonexistent' })).toEqual({
				ok: false,
				issues: [
					{
						path: ['type'],
						message: expect.stringMatching(
							/Unknown validation rule 'nonexistent'.*Registered rules: faulty, fine\./,
						),
					},
				],
			});
			expect(registry.check({ type: 'faulty' })).toEqual({
				ok: false,
				issues: [{ path: ['type'], message: expect.stringMatching(/could not be built: no good/) }],
			});
		});

		it('reports an option its registration refuses at its key, and returns the rule as the registration parses it', () => {
			const registry = createValidationRegistry([
				registration('sized', {
					schema: z.object({ type: z.literal('sized'), size: z._default(z.number(), 10) }),
					handler: () => z.string(),
				}),
			]);

			expect(registry.check({ type: 'sized' })).toEqual({ ok: true, rule: { type: 'sized', size: 10 } });
			expect(registry.check({ type: 'sized', size: 'big' } as { type: string })).toEqual({
				ok: false,
				issues: [
					{
						path: ['size'],
						message: 'Expected number.',
						code: 'invalid_type',
						params: { expected: 'number' },
					},
				],
			});
		});

		it('lets the later registration of a type win without logging', () => {
			const spies = (['debug', 'info', 'warn', 'error'] as const).map((level) => vi.spyOn(logger, level));
			const registry = createValidationRegistry([
				registration('test', { handler: () => z.string() }),
				registration('test', { handler: () => z.number() }),
			]);

			const schema = registry.createSchema({ type: 'test' }, createValidationContext());
			expect(schema.parse(123)).toBe(123);
			expect(registry.size).toBe(1);
			for (const spy of spies) {
				expect(spy).not.toHaveBeenCalled();
				spy.mockRestore();
			}
		});
	});
});
