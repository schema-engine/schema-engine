import { describe, test, expect } from 'vitest';
import type { ElementConfig } from '@schema-engine/forms/schemas';
import { InputFieldSchema, type InputFieldConfig } from '@/components/schema-engine/forms/inputs/form-input.types';
import {
	TextareaFieldSchema,
	type TextareaFieldConfig,
} from '@/components/schema-engine/forms/inputs/form-textarea.types';
import {
	SelectFieldConfigSchema,
	type SelectFieldConfig,
} from '@/components/schema-engine/forms/inputs/form-select.types';
import {
	RadioFieldConfigSchema,
	type RadioFieldConfig,
} from '@/components/schema-engine/forms/inputs/form-radio.types';
import {
	NumberFieldConfigSchema,
	type NumberFieldConfig,
} from '@/components/schema-engine/forms/inputs/form-number.types';
import {
	SwitchFieldConfigSchema,
	type SwitchFieldConfig,
} from '@/components/schema-engine/forms/inputs/form-switch.types';
import {
	CheckboxFieldConfigSchema,
	type CheckboxFieldConfig,
} from '@/components/schema-engine/forms/inputs/form-checkbox.types';

describe('Clean Enhanced Field System', () => {
	test('should use id-based configuration for input', () => {
		const enhancedConfig: InputFieldConfig = {
			$type: 'input',
			id: 'username',
			name: 'username',
			inputType: 'text',
			label: 'Username',
			spellCheck: false,
		};

		const result = InputFieldSchema.safeParse(enhancedConfig);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.$type).toBe('input');
			expect(result.data.spellCheck).toBe(false);
		}
	});

	test('should use id-based configuration for textarea', () => {
		const textareaConfig: TextareaFieldConfig = {
			$type: 'textarea',
			id: 'description',
			name: 'description',
			label: 'Description',
			rows: 4,
			resize: 'vertical',
			spellCheck: true,
		};

		const result = TextareaFieldSchema.safeParse(textareaConfig);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.$type).toBe('textarea');
			expect(result.data.rows).toBe(4);
			expect(result.data.resize).toBe('vertical');
		}
	});

	test('should validate configs for multiple registered field types', () => {
		const inputConfig: ElementConfig = {
			$type: 'input',
			id: 'email',
			name: 'email',
			inputType: 'email',
			inputMode: 'email',
		};

		const textareaConfig: ElementConfig = {
			$type: 'textarea',
			id: 'bio',
			name: 'bio',
			rows: 6,
			wrap: 'soft',
		};

		expect(InputFieldSchema.safeParse(inputConfig).success).toBe(true);
		expect(TextareaFieldSchema.safeParse(textareaConfig).success).toBe(true);
	});

	test('should validate input field configuration with all properties', () => {
		const fullInputConfig: InputFieldConfig = {
			$type: 'input',
			id: 'full-test',
			name: 'fullTest',
			inputType: 'email',
			label: 'Full Test Field',
			description: 'This is a comprehensive test field',
			placeholder: 'Enter email...',
			disabled: false,
			readonly: false,
			defaultValue: '',
			className: 'test-class',
			style: { '--field-color': 'blue' },
			autoComplete: 'email',
			autoFocus: true,
			inputMode: 'email',
			spellCheck: false,
		};

		const result = InputFieldSchema.safeParse(fullInputConfig);
		expect(result.success).toBe(true);

		if (result.success) {
			expect(result.data.$type).toBe('input');
			expect(result.data.inputType).toBe('email');
			expect(result.data.label).toBe('Full Test Field');
			expect(result.data.autoComplete).toBe('email');
			expect(result.data.inputMode).toBe('email');
		}
	});

	test('should validate textarea field configuration with all properties', () => {
		const fullTextareaConfig: TextareaFieldConfig = {
			$type: 'textarea',
			id: 'full-textarea-test',
			name: 'fullTextareaTest',
			label: 'Full Textarea Test',
			description: 'This is a comprehensive textarea test field',
			placeholder: 'Enter your text...',
			rows: 8,
			cols: 50,
			resize: 'both',
			spellCheck: true,
			wrap: 'hard',
			className: 'textarea-test-class',
			style: { '--field-background': 'lightgray' },
		};

		const result = TextareaFieldSchema.safeParse(fullTextareaConfig);
		expect(result.success).toBe(true);

		if (result.success) {
			expect(result.data.$type).toBe('textarea');
			expect(result.data.rows).toBe(8);
			expect(result.data.cols).toBe(50);
			expect(result.data.resize).toBe('both');
			expect(result.data.wrap).toBe('hard');
		}
	});

	test('should enforce validation rules come from rules property only', () => {
		// Input field should not have validation props like maxLength, minLength, pattern
		const inputConfig: InputFieldConfig = {
			$type: 'input',
			id: 'test-input',
			name: 'testInput',
			inputType: 'text',
			// These would be validation and should come from rules, not direct props
			rules: [
				{ type: 'required', message: 'This field is required' },
				{ type: 'maxLength', value: 50, message: 'Maximum 50 characters' },
			],
		};

		const result = InputFieldSchema.safeParse(inputConfig);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.rules).toBeDefined();
			expect(result.data.rules?.length).toBe(2);
			// maxLength should NOT be a direct property
			expect('maxLength' in result.data).toBe(false);
		}
	});

	test('should validate select field with options', () => {
		const selectConfig: SelectFieldConfig = {
			$type: 'select',
			id: 'country',
			name: 'country',
			label: 'Country',
			options: [
				{ value: 'us', label: 'United States' },
				{ value: 'ca', label: 'Canada', disabled: true },
				{ value: 'uk', label: 'United Kingdom' },
			],
			placeholder: 'Select a country...',
			autoComplete: 'country',
		};

		const result = SelectFieldConfigSchema.safeParse(selectConfig);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.$type).toBe('select');
			expect(result.data.options.length).toBe(3);
			expect(result.data.options[0].value).toBe('us');
			expect(result.data.options[1].disabled).toBe(true);
		}
	});

	test('should validate checkbox field configuration', () => {
		const checkboxConfig: CheckboxFieldConfig = {
			$type: 'checkbox',
			id: 'terms',
			name: 'terms',
			label: 'I agree to the terms and conditions',
			autoFocus: true,
			defaultValue: false,
		};

		const result = CheckboxFieldConfigSchema.safeParse(checkboxConfig);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.$type).toBe('checkbox');
			expect(result.data.autoFocus).toBe(true);
		}
	});

	test('should validate radio field with options', () => {
		const radioConfig: RadioFieldConfig = {
			$type: 'radio',
			id: 'size',
			name: 'size',
			label: 'Size',
			options: [
				{ value: 'small', label: 'Small' },
				{ value: 'medium', label: 'Medium' },
				{ value: 'large', label: 'Large', disabled: true },
			],
			orientation: 'horizontal',
			autoFocus: true,
		};

		const result = RadioFieldConfigSchema.safeParse(radioConfig);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.$type).toBe('radio');
			expect(result.data.options.length).toBe(3);
			expect(result.data.orientation).toBe('horizontal');
			expect(result.data.options[2].disabled).toBe(true);
		}
	});

	test('should validate number field configuration', () => {
		const numberConfig: NumberFieldConfig = {
			$type: 'number',
			id: 'age',
			name: 'age',
			label: 'Age',
			min: 0,
			max: 120,
			step: 1,
			inputMode: 'numeric',
			autoComplete: 'age',
		};

		const result = NumberFieldConfigSchema.safeParse(numberConfig);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.$type).toBe('number');
			expect(result.data.min).toBe(0);
			expect(result.data.max).toBe(120);
			expect(result.data.step).toBe(1);
		}
	});

	test('should validate switch field configuration', () => {
		const switchConfig: SwitchFieldConfig = {
			$type: 'switch',
			id: 'notifications',
			name: 'notifications',
			label: 'Enable notifications',
			size: 'md',
			autoFocus: true,
			defaultValue: true,
		};

		const result = SwitchFieldConfigSchema.safeParse(switchConfig);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.$type).toBe('switch');
			expect(result.data.size).toBe('md');
			expect(result.data.autoFocus).toBe(true);
		}
	});

	test('should validate all registered field types', () => {
		const fields: ElementConfig[] = [
			{
				$type: 'input',
				id: 'email',
				name: 'email',
				inputType: 'email',
			},
			{
				$type: 'textarea',
				id: 'message',
				name: 'message',
				rows: 4,
			},
			{
				$type: 'select',
				id: 'category',
				name: 'category',
				options: [{ value: '1', label: 'Option 1' }],
			},
			{
				$type: 'checkbox',
				id: 'agree',
				name: 'agree',
			},
			{
				$type: 'radio',
				id: 'size',
				name: 'size',
				options: [{ value: 'small', label: 'Small' }],
			},
			{
				$type: 'number',
				id: 'quantity',
				name: 'quantity',
			},
			{
				$type: 'switch',
				id: 'enabled',
				name: 'enabled',
			},
		];

		for (const field of fields) {
			let result;
			switch (field.$type) {
				case 'input':
					result = InputFieldSchema.safeParse(field);
					break;
				case 'select':
					result = SelectFieldConfigSchema.safeParse(field);
					break;
				case 'checkbox':
					result = CheckboxFieldConfigSchema.safeParse(field);
					break;
				case 'radio':
					result = RadioFieldConfigSchema.safeParse(field);
					break;
				case 'number':
					result = NumberFieldConfigSchema.safeParse(field);
					break;
				case 'switch':
					result = SwitchFieldConfigSchema.safeParse(field);
					break;
				default:
					continue;
			}

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.$type).toBe(field.$type);
			}
		}
	});
});
