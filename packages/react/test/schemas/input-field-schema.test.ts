/**
 * Input Field Schema Validation Tests
 * Tests for the InputFieldSchema and related type definitions
 */

import { describe, test, expect } from 'bun:test';
import { 
	InputFieldSchema, 
	inputFieldExample,
	type InputFieldConfig 
} from '@/components/form/fields/form-input.types';

describe('Input Field Schema', () => {
	test('validates valid input field configuration', () => {
		const validConfig: InputFieldConfig = {
			componentId: 'input',
			id: 'test-input',
			name: 'testField',
			label: 'Test Input',
			inputType: 'email',
			placeholder: 'Enter email...',
			autoComplete: 'email',
		};

		const result = InputFieldSchema.safeParse(validConfig);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.componentId).toBe('input');
			expect(result.data.inputType).toBe('email');
		}
	});

	test('rejects invalid input field configuration', () => {
		const invalidConfig = {
			componentId: 'input',
			inputType: 'invalid-type',
		};

		const result = InputFieldSchema.safeParse(invalidConfig);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.length).toBeGreaterThan(0);
		}
	});

	test('validates serializable input field schema', () => {
		const validConfig: InputFieldConfig = {
			componentId: 'input',
			id: 'serializable-input',
			name: 'serializableField',
			inputType: 'text',
			placeholder: 'Test placeholder',
		};

		const result = InputFieldSchema.safeParse(validConfig);
		expect(result.success).toBe(true);
	});

	test('validates example configuration', () => {
		const result = InputFieldSchema.safeParse(inputFieldExample);
		expect(result.success).toBe(true);
	});

	test('validates all supported input types', () => {
		const inputTypes = ['text', 'email', 'password', 'url', 'tel', 'search'] as const;
		
		for (const inputType of inputTypes) {
			const config: InputFieldConfig = {
				componentId: 'input',
				id: `test-${inputType}`,
				name: `test${inputType}`,
				inputType,
			};

			const result = InputFieldSchema.safeParse(config);
			expect(result.success).toBe(true);
		}
	});

	test('uses default input type when not specified', () => {
		const configWithoutType = {
			componentId: 'input',
			id: 'default-test',
			name: 'defaultTest',
		};

		const result = InputFieldSchema.safeParse(configWithoutType);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.inputType).toBe('text');
		}
	});

	test('validates optional properties', () => {
		const configWithOptionals: InputFieldConfig = {
			componentId: 'input',
			id: 'optional-test',
			name: 'optionalTest',
			inputType: 'text',
			autoComplete: 'username',
			autoFocus: true,
			placeholder: 'Enter text...',
			description: 'Test description',
			label: 'Test Label',
			disabled: false,
			readonly: false,
		};

		const result = InputFieldSchema.safeParse(configWithOptionals);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.autoComplete).toBe('username');
			expect(result.data.autoFocus).toBe(true);
		}
	});

	test('validates required fields with default inputType', () => {
		const minimalConfig = {
			componentId: 'input' as const,
			id: 'minimal',
			name: 'minimal',
		};

		const result = InputFieldSchema.safeParse(minimalConfig);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.inputType).toBe('text');
		}
	});

	test('rejects missing required fields', () => {
		const invalidConfig = {
			componentId: 'input',
		};

		const result = InputFieldSchema.safeParse(invalidConfig);
		expect(result.success).toBe(false);
	});

	test('validates HTML input attributes', () => {
		const config: InputFieldConfig = {
			componentId: 'input',
			id: 'html-attrs',
			name: 'htmlAttrs',
			inputType: 'email',
			autoComplete: 'email',
			autoFocus: true,
			spellCheck: false,
			placeholder: 'test',
			readonly: false,
			disabled: false,
		};

		const result = InputFieldSchema.safeParse(config);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.autoComplete).toBe('email');
			expect(result.data.spellCheck).toBe(false);
		}
	});
});

describe('Input Field Type Safety', () => {
	test('input field configuration has correct type structure', () => {
		const config: InputFieldConfig = {
			componentId: 'input',
			id: 'type-test',
			name: 'typeTest',
			inputType: 'email',
			label: 'Type Test',
		};

		expect(config.componentId).toBe('input');
		expect(typeof config.inputType).toBe('string');
		expect(typeof config.id).toBe('string');
		expect(typeof config.name).toBe('string');
	});

	test('componentId is correctly typed as literal', () => {
		const config: InputFieldConfig = {
			componentId: 'input',
			id: 'literal-test',
			name: 'literalTest',
			inputType: 'text',
		};

		const componentId: 'input' = config.componentId;
		expect(componentId).toBe('input');
	});
});
