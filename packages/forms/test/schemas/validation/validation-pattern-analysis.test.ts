import { test, expect, describe } from 'vitest';
import {
	createValidationContext,
	createDefaultValidationRegistry,
	ValidationPresets,
	type ValidationRule,
} from '@/schemas/validation';


const validationRegistry = createDefaultValidationRegistry();

describe('ValidationRegistry Usage Pattern Analysis', () => {
	describe('Current ValidationRegistry.presets Usage', () => {
		test('should use registry presets for rule creation', () => {
			const emailRule = validationRegistry.presets.string.email();
			const requiredRule = validationRegistry.presets.string.required('Required');
			const minRule = validationRegistry.presets.number.min(18);

			expect(emailRule.type).toBe('email');
			expect(requiredRule.type).toBe('required');
			expect(minRule.type).toBe('min');
		});

		test('should create schemas from preset-generated rules', () => {
			const rule = validationRegistry.presets.string.email('Invalid email');
			const schema = validationRegistry.createSchema(rule, createValidationContext());

			expect(schema).not.toBeNull();
			expect(() => schema?.parse('test@example.com')).not.toThrow();
			expect(() => schema?.parse('invalid-email')).toThrow();
		});
	});

	describe('Usage Pattern Comparison', () => {
		test('APPROACH A: Registry presets (current)', () => {
			const rules = [
				validationRegistry.presets.string.required('Email required'),
				validationRegistry.presets.string.email('Invalid email'),
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
				validationRegistry.presets.string.required('Required'),
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
