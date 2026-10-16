import { test, expect, describe } from 'vitest';
import {
	createValidationContext,
	createDefaultValidationRegistry,
	ValidationPresets,
	type ValidationRule,
} from '@/schemas/validation';

const validationRegistry = createDefaultValidationRegistry();

describe('ValidationRegistry Usage Pattern Analysis', () => {
	describe('Current ValidationPresets Usage', () => {
		test('should use standalone presets for rule creation', () => {
			const emailRule = ValidationPresets.string.email();
			const requiredRule = ValidationPresets.string.required('Required');
			const minRule = ValidationPresets.number.min(18);

			expect(emailRule.type).toBe('email');
			expect(requiredRule.type).toBe('required');
			expect(minRule.type).toBe('min');
		});

		test('should create schemas from preset-generated rules', () => {
			const rule = ValidationPresets.string.email('Invalid email');
			const schema = validationRegistry.createSchema(rule, createValidationContext());

			expect(schema).not.toBeNull();
			expect(() => schema?.parse('test@example.com')).not.toThrow();
			expect(() => schema?.parse('invalid-email')).toThrow();
		});
	});

	describe('Usage Pattern Comparison', () => {
		test('APPROACH A: Registry presets (current)', () => {
			const rules = [
				ValidationPresets.string.required('Email required'),
				ValidationPresets.string.email('Invalid email'),
			];

			expect(rules[0].type).toBe('required');
			expect(rules[1].type).toBe('email');
		});

		test('APPROACH B: Direct JSON rules (simplest)', () => {
			const rules: ValidationRule[] = [
				{ type: 'required', message: 'Email required' },
				{ type: 'email', message: 'Invalid email' },
			];

			rules.forEach((rule) => {
				const schema = validationRegistry.createSchema(rule, createValidationContext());
				expect(schema).not.toBeNull();
			});
		});

		test('APPROACH C: ValidationPresets', () => {
			const rules = [ValidationPresets.string.required('Required'), ValidationPresets.string.email('Invalid')];

			expect(rules[0].type).toBe('required');
			expect(rules[1].type).toBe('email');
		});
	});

	describe('Efficiency Analysis', () => {
		test('should handle JSON serialization/deserialization', () => {
			const rules: ValidationRule[] = [
				ValidationPresets.string.required('Required'),
				{ type: 'email', message: 'Invalid' },
			] as ValidationRule[];

			const serialized = JSON.stringify(rules);
			const deserialized: ValidationRule[] = JSON.parse(serialized);

			expect(deserialized).toEqual(rules);

			deserialized.forEach((rule) => {
				expect(validationRegistry.createSchema(rule, createValidationContext())).not.toBeNull();
			});
		});

		test('should be efficient for form configurations', () => {
			const formConfig = {
				fields: [
					{
						name: 'email',
						rules: [
							{ type: 'required', message: 'Required' },
							{ type: 'email', message: 'Invalid email' },
						] as ValidationRule[],
					},
				],
			};

			expect(JSON.stringify(formConfig)).toContain('"type":"required"');
		});
	});
});
