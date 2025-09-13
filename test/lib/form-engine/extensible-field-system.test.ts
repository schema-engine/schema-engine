import { describe, test, expect } from 'bun:test';
import type { FieldConfig, ComponentId, GetFieldConfig } from '@/lib/form-engine/schemas/field-config';

// Import field types to register them in the global registry
import '@/lib/form-engine/components/form/fields/form-input.types';
import '@/lib/form-engine/components/form/fields/form-textarea.types';
import '@/lib/form-engine/components/form/fields/form-select.types';

describe('Extensible Field Configuration System', () => {
	test('provides proper type safety for field configurations', () => {
		// Test that FieldConfig is a proper union of all registered field types
		const inputField: FieldConfig = {
			componentId: 'input',
			id: 'test-input',
			name: 'testInput',
			label: 'Test Input',
			inputType: 'text',
		};

		const textareaField: FieldConfig = {
			componentId: 'textarea',
			id: 'test-textarea',
			name: 'testTextarea',
			label: 'Test Textarea',
			rows: 4,
		};

		const selectField: FieldConfig = {
			componentId: 'select',
			id: 'test-select',
			name: 'testSelect',
			label: 'Test Select',
			options: [
				{ value: 'option1', label: 'Option 1' },
				{ value: 'option2', label: 'Option 2' },
			],
		};

		// These should all be valid
		expect(inputField.componentId).toBe('input');
		expect(textareaField.componentId).toBe('textarea');
		expect(selectField.componentId).toBe('select');
	});

	test('component ID type includes all registered field types', () => {
		// This test ensures ComponentId is properly typed
		const validIds: ComponentId[] = ['input', 'textarea', 'select'];
		
		validIds.forEach(id => {
			expect(typeof id).toBe('string');
		});
	});

	test('GetFieldConfig provides proper typing for specific field types', () => {
		// Test type extraction
		type InputConfig = GetFieldConfig<'input'>;
		type TextareaConfig = GetFieldConfig<'textarea'>;
		type SelectConfig = GetFieldConfig<'select'>;

		const inputConfig: InputConfig = {
			componentId: 'input',
			id: 'test',
			name: 'test',
			inputType: 'email', // This should be properly typed
		};

		const selectConfig: SelectConfig = {
			componentId: 'select',
			id: 'test',
			name: 'test',
			options: [], // This should be properly typed and required
		};

		expect(inputConfig.inputType).toBe('email');
		expect(Array.isArray(selectConfig.options)).toBe(true);
	});
});

/**
 * Example of how a library user would extend the system
 */

// Define a custom field type
interface CustomFieldConfig {
	componentId: 'customField';
	id: string;
	name: string;
	customProperty: string;
	customOptions?: {
		feature1: boolean;
		feature2: number;
	};
}

// Register it in the global type system
declare global {
	namespace FormEngine {
		interface FieldConfigRegistry {
			customField: CustomFieldConfig;
		}
	}
}

describe('Field System Extensibility', () => {
	test('allows library users to add custom field types', () => {
		// Now FieldConfig includes our custom type
		const customField: FieldConfig = {
			componentId: 'customField',
			id: 'my-custom',
			name: 'myCustom',
			customProperty: 'test value',
			customOptions: {
				feature1: true,
				feature2: 42,
			},
		};

		// And we get full type safety
		type CustomConfig = GetFieldConfig<'customField'>;
		const typedCustomField: CustomConfig = customField;

		expect(customField.componentId).toBe('customField');
		expect(typedCustomField.customProperty).toBe('test value');
		expect(typedCustomField.customOptions?.feature1).toBe(true);
	});

	test('component ID type is automatically extended', () => {
		// ComponentId now includes 'customField'
		const allIds: ComponentId[] = ['input', 'textarea', 'select', 'customField'];
		
		expect(allIds).toContain('customField');
	});
});