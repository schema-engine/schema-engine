import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';
import type { FormConfig } from '@json-form-engine/core/schemas';
import '@json-form-engine/react/components/form/registry';

/**
 * Simple validation demo showing different validation rules
 */
export function ValidationDemo() {
	const config: FormConfig = {
		id: 'validation-demo',
		mode: 'free',
		autoGenerateSchema: true,
		steps: [
			{
				id: 'validation-step',
				title: 'Try Different Validation Rules',
				elements: [
					{
						componentId: 'input',
						inputType: 'text',
						id: 'username',
						name: 'username',
						label: 'Username (3-20 characters)',
						placeholder: 'Enter username',
						rules: [
							ValidationPresets.required('Username is required'),
							ValidationPresets.minLength(3, 'Minimum 3 characters'),
							ValidationPresets.maxLength(20, 'Maximum 20 characters'),
						],
					},
					{
						componentId: 'number',
						id: 'age',
						name: 'age',
						label: 'Age (18-100)',
						placeholder: 'Enter your age',
						rules: [
							ValidationPresets.required('Age is required'),
							ValidationPresets.min(18, 'Must be at least 18'),
							ValidationPresets.max(100, 'Must be less than 100'),
						],
					},
					{
						componentId: 'input',
						inputType: 'url',
						id: 'website',
						name: 'website',
						label: 'Website (optional)',
						placeholder: 'https://example.com',
						rules: [ValidationPresets.url('Please enter a valid URL')],
					},
				],
			},
		],
		actions: [
			{
				id: 'validation-demo-submit',
				type: 'submit',
				description: 'Submit validation demo',
				successMessage: 'All validations passed! ✅',
				errorMessage: 'Please fix the validation errors above.',
				enabled: true,
				endpoint: '/api/demo-submit',
				method: 'POST',
			},
		],
	};

	return (
		<div className="border rounded-lg p-4 bg-gray-50/50">
			<FormRenderer config={config} />
		</div>
	);
}
