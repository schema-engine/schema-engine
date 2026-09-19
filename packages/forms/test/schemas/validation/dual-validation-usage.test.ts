import { test, expect, describe } from 'vitest';
import {
	createValidationContext,
	ValidationPresets,
	validationRegistry,
	type ValidationRule,
} from '../../../src/schemas/validation';

describe('Dual Usage Pattern: JSON + Presets', () => {
	describe('OPTION 1: Direct JSON (Simple & Flexible)', () => {
		test('should work with direct JSON rules', () => {
			const rules = [
				{ type: 'required', message: 'Name is required' },
				{ type: 'minLength', value: 2, message: 'Too short' },
				{ type: 'email', message: 'Invalid email' },
			] as ValidationRule[];

			const json = JSON.stringify(rules);
			expect(json).toContain('"type":"required"');

			rules.forEach((rule) => {
				const schema = validationRegistry.createSchema(rule, createValidationContext());
				expect(schema).not.toBeNull();
			});
		});

		test('should work in form configurations', () => {
			const formConfig = {
				id: 'contact-form',
				steps: [
					{
						elements: [
							{
								name: 'email',
								rules: [
									{ type: 'required', message: 'Email required' },
									{ type: 'email', message: 'Must be valid email' },
								] as ValidationRule[],
							},
							{
								name: 'age',
								rules: [
									{ type: 'min', value: 18, message: 'Must be 18+' },
									{ type: 'max', value: 120, message: 'Invalid age' },
								] as ValidationRule[],
							},
						],
					},
				],
			};

			const serialized = JSON.stringify(formConfig);
			expect(serialized).toContain('"type":"required"');
			expect(serialized).toContain('"value":18');
		});
	});

	describe('OPTION 2: ValidationPresets (Convenient & Discoverable)', () => {
		test('should use ValidationPresets for easy rule creation', () => {
			const rules = [
				ValidationPresets.string.required('Name is required'),
				ValidationPresets.string.minLength(2, 'Too short'),
				ValidationPresets.string.email('Invalid email'),
				ValidationPresets.number.min(18, 'Must be 18+'),
			] as ValidationRule[];

			expect(rules[0].type).toBe('required');
			expect(rules[1].type).toBe('minLength');
			expect(rules[2].type).toBe('email');
			expect(rules[3].type).toBe('min');

			rules.forEach((rule) => {
				const schema = validationRegistry.createSchema(rule, createValidationContext());
				expect(schema).not.toBeNull();
			});
		});

		test('should be organized by category', () => {
			expect(ValidationPresets.string).toBeDefined();
			expect(ValidationPresets.number).toBeDefined();
			expect(ValidationPresets.array).toBeDefined();
			expect(ValidationPresets.date).toBeDefined();
			expect(ValidationPresets.network).toBeDefined();

			expect(ValidationPresets.string.email().type).toBe('email');
			expect(ValidationPresets.number.min(5).type).toBe('min');
			expect(ValidationPresets.array.minItems(1).type).toBe('minItems');
		});
	});

	describe('HYBRID USAGE: Mix Both Approaches', () => {
		test('should mix JSON and presets in same form', () => {
			const formField = {
				name: 'profile',
				rules: [
					ValidationPresets.string.required('Profile name required'),
					{ type: 'maxLength', value: 50, message: 'Too long' } satisfies ValidationRule,
					ValidationPresets.string.pattern('[a-zA-Z0-9_]+', 'Only letters, numbers, underscore'),
				],
			};

			formField.rules.forEach((rule) => {
				const schema = validationRegistry.createSchema(rule, createValidationContext());
				expect(schema).not.toBeNull();
			});

			const serialized = JSON.stringify(formField);
			expect(serialized).toContain('"type":"required"');
			expect(serialized).toContain('"type":"maxLength"');
		});
	});

	describe('Developer Experience Comparison', () => {
		test('JSON approach: minimal and direct', () => {
			const field = {
				rules: [{ type: 'required' }, { type: 'email' }] as ValidationRule[],
			};

			expect(field.rules).toHaveLength(2);
		});

		test('Presets approach: discoverable and guided', () => {
			const field = {
				rules: [ValidationPresets.string.required(), ValidationPresets.string.email()],
			};

			expect(field.rules).toHaveLength(2);
		});

		test('both create identical rule objects', () => {
			const jsonRule = { type: 'required', message: 'Required' } as ValidationRule;
			const presetRule = ValidationPresets.string.required('Required');

			expect(jsonRule.type).toBe('required');
			expect(presetRule.type).toBe('required');
			expect(jsonRule.message).toBe(presetRule.message);
		});
	});
});
