import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';
import type { FormConfig } from '@json-form-engine/core/schemas';
import '@json-form-engine/react/components/form/registry';

/**
 * Comprehensive field types demo for documentation
 */
export function FieldTypesDemo() {
	const config: FormConfig = {
		id: 'field-types-demo',
		mode: 'free',
		
		grid: {
			columns: 1,
			gap: '1rem',
			responsive: {
				default: { columns: 1 },
				md: { columns: 2 },
			},
		},
		steps: [
			{
				id: 'field-types-step',
				title: 'Explore Different Field Types',
				elements: [
					{
						componentId: 'input',
						inputType: 'text',
						id: 'textField',
						name: 'textField',
						label: 'Text Input',
						placeholder: 'Enter any text',
					},
					{
						componentId: 'input',
						inputType: 'email',
						id: 'emailField',
						name: 'emailField',
						label: 'Email Input',
						placeholder: 'user@example.com',
						rules: [ValidationPresets.email('Invalid email')],
					},
					{
						componentId: 'number',
						id: 'numberField',
						name: 'numberField',
						label: 'Number Input',
						placeholder: '42',
					},
					{
						componentId: 'textarea',
						id: 'textareaField',
						name: 'textareaField',
						label: 'Textarea',
						placeholder: 'Multi-line text...',
						rows: 3,
					},
					{
						componentId: 'select',
						id: 'selectField',
						name: 'selectField',
						label: 'Select Dropdown',
						placeholder: 'Choose option',
						options: [
							{ value: 'option1', label: 'Option 1' },
							{ value: 'option2', label: 'Option 2' },
							{ value: 'option3', label: 'Option 3' },
						],
					},
					{
						componentId: 'radio',
						id: 'radioField',
						name: 'radioField',
						label: 'Radio Group',
						options: [
							{ value: 'small', label: 'Small' },
							{ value: 'medium', label: 'Medium' },
							{ value: 'large', label: 'Large' },
						],
					},
					{
						componentId: 'checkbox',
						id: 'checkboxField',
						name: 'checkboxField',
						label: 'Checkbox Option',
					},
					{
						componentId: 'switch',
						id: 'switchField',
						name: 'switchField',
						label: 'Toggle Switch',
					}
				],
			},
		],
		actions: [
			{
				id: 'field-types-demo-submit',
				type: 'submit',
				description: 'Submit field types demo',
				successMessage: 'All field types submitted successfully! 🎯',
				errorMessage: 'Failed to submit form. Please check the fields above.',
				enabled: true,
				endpoint: '/api/demo-submit',
				method: 'POST',
			},
		],
	};

	return (
		<div className="border rounded-lg p-4 bg-gray-50/50">
			<p className="text-sm text-gray-600 mb-4">🎯 Try different field types and see how they behave</p>
			<FormRenderer config={config} />
		</div>
	);
}
