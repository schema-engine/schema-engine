import { describe, test, expect } from 'bun:test';
import {
	InputFieldSchema,
	inputFieldExample,
	type InputFieldConfig,
} from '@/components/elements/inputs/form-input.types';

describe('Enhanced Form Field System', () => {
	describe('Input Field Schema', () => {
		test('validates valid input field configuration', () => {
			const validConfig: InputFieldConfig = {
				$type: 'input',
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
				expect(result.data.$type).toBe('input');
				expect(result.data.inputType).toBe('email');
			}
		});
		test('rejects invalid input field configuration', () => {
			const invalidConfig = {
				$type: 'input',
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
				$type: 'input',
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
	});

	describe('Input Field Specific Properties', () => {
		test('validates all supported input types', () => {
			const inputTypes = ['text', 'email', 'password', 'url', 'tel', 'search'] as const;

			for (const inputType of inputTypes) {
				const config: InputFieldConfig = {
					$type: 'input',
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
				$type: 'input',
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
				$type: 'input',
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
	});
});
