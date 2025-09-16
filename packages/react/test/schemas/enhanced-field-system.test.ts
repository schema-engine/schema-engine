import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { formFieldRegistry } from '@json-form-engine/core/schemas/registry';
import { defaultFormFieldRegistry } from '@/registry';
import { 
	InputFieldSchema, 
	inputFieldExample,
	type InputFieldConfig 
} from '@/components/form/fields/form-input.types';

import '@/components/form/fields/form-input.registry';

describe('Enhanced Form Field System', () => {
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
	});

	describe('Field Registry', () => {
		test('input field is registered', () => {
			expect(defaultFormFieldRegistry.hasFieldType('input')).toBe(true);
		});

		test('returns available field types', () => {
			const fieldTypes = defaultFormFieldRegistry.getFieldTypes();
			expect(fieldTypes).toContain('input');
			expect(fieldTypes.length).toBeGreaterThan(0);
		});

		test('retrieves input field metadata', () => {
			const metadata = defaultFormFieldRegistry.getMetadata('input');
			expect(metadata).toBeDefined();
			expect(metadata?.title).toBe('Text Input Field');
			expect(metadata?.category).toBe('input');
		});

		test('retrieves component for input field', () => {
			const component = defaultFormFieldRegistry.getComponent('input');
			expect(component).toBeDefined();
			expect(typeof component).toBe('function');
		});

		test('retrieves runtime schema for input field', () => {
			const schema = defaultFormFieldRegistry.getRuntimeSchema('input');
			expect(schema).toBeDefined();
			expect(schema).toBe(InputFieldSchema);
		});

		test('retrieves serializable schema for input field', () => {
			const schema = defaultFormFieldRegistry.getSerializableSchema('input');
			expect(schema).toBeDefined();
			expect(schema).toBe(InputFieldSchema);
		});
	});

	describe('Field Validation', () => {
		test('validates correct field configuration through registry', () => {
			const validConfig = {
				componentId: 'input',
				id: 'registry-test',
				name: 'registryField',
				label: 'Registry Test',
				inputType: 'text',
			};

			const validation = defaultFormFieldRegistry.validateField(validConfig);
			expect(validation.success).toBe(true);
			expect(validation.data).toBeDefined();
		});

		test('rejects invalid field configuration through registry', () => {
			const invalidConfig = {
				componentId: 'input',
				inputType: 'invalid',
			};

			const validation = defaultFormFieldRegistry.validateField(invalidConfig);
			expect(validation.success).toBe(false);
			expect(validation.error).toBeDefined();
		});

		test('rejects unknown field type', () => {
			const unknownConfig = {
				componentId: 'unknown-field',
				id: 'test',
				name: 'test',
			};

			const validation = defaultFormFieldRegistry.validateField(unknownConfig);
			expect(validation.success).toBe(false);
			expect(validation.error).toContain('Unknown field type: unknown-field');
		});

		test('rejects configuration without componentId', () => {
			const noTypeConfig = {
				id: 'test',
				name: 'test',
			};

			const validation = defaultFormFieldRegistry.validateField(noTypeConfig);
			expect(validation.success).toBe(false);
			expect(validation.error).toContain('Field componentId is required');
		});
	});

	describe('Serialization', () => {
		test('converts field to serializable format', () => {
			const fieldConfig = {
				componentId: 'input',
				id: 'serializable-test',
				name: 'serializableField',
				inputType: 'email',
				label: 'Serializable Test',
			};

			const serializable = defaultFormFieldRegistry.toSerializable(fieldConfig);
			expect(serializable).toBeDefined();
			expect(serializable?.componentId).toBe('input');
			expect(serializable?.id).toBe('serializable-test');
		});

		test('returns null for invalid serialization', () => {
			const invalidConfig = {
				componentId: 'input',
			};

			const serializable = defaultFormFieldRegistry.toSerializable(invalidConfig);
			expect(serializable).toBeNull();
		});
	});

	describe('JSON Schema Generation', () => {
		test('generates JSON schema for input field', () => {
			const jsonSchema = defaultFormFieldRegistry.toJSONSchema('input');
			expect(jsonSchema).toBeDefined();
			
			if (jsonSchema && typeof jsonSchema === 'object') {
				expect((jsonSchema as any).type).toBe('object');
				expect((jsonSchema as any).properties).toBeDefined();
			}
		});

		test('returns null for unknown field type JSON schema', () => {
			//@ts-expect-error
			const jsonSchema = defaultFormFieldRegistry.toJSONSchema('unknown');
			expect(jsonSchema).toBeNull();
		});

		test('exports all schemas as JSON registry', () => {
			const allSchemas = defaultFormFieldRegistry.toJSONSchemaRegistry();
			expect(allSchemas).toBeDefined();
			expect(allSchemas.input).toBeDefined();
		});

		test('exports metadata as JSON', () => {
			const metadata = defaultFormFieldRegistry.exportMetadata();
			expect(metadata).toBeDefined();
			expect(metadata.input).toBeDefined();
			expect(metadata.input.title).toBe('Text Input Field');
		});
	});

	describe('Input Field Specific Properties', () => {
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
	});

	describe('Zod Registry Integration', () => {
		test('formFieldRegistry is properly initialized', () => {
			expect(formFieldRegistry).toBeDefined();
		});

		test('can register and retrieve metadata from Zod registry', () => {
			const testSchema = z.string();
			const testMetadata = {
				id: 'test-schema',
				title: 'Test Schema',
				description: 'A test schema',
			};

			testSchema.register(formFieldRegistry, testMetadata);
			const retrieved = formFieldRegistry.get(testSchema);
			
			expect(retrieved).toBeDefined();
			expect(retrieved?.title).toBe('Test Schema');
		});
	});
});

describe('Type Safety and Integration', () => {
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

	test('field validation integrates with type system', () => {
		const validation = defaultFormFieldRegistry.validateField(inputFieldExample);
		expect(validation.success).toBe(true);
		
		if (validation.success) {
			expect(validation.data?.componentId).toBe('input');
			expect((validation.data as FormEngine.FieldConfigRegistry['input']).inputType).toBe('text');
		}
	});
});