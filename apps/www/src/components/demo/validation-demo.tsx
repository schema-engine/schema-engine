import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';
import type { FormConfig } from '@json-form-engine/core/schemas';
import '@/lib/form-engine-setup';

/**
 * Simple validation demo showing different validation rules
 */
export function ValidationDemo() {
	const config: FormConfig = {
		id: 'validation-demo',
		mode: 'free',
		steps: [
			{
				id: 'validation-step',
				title: 'Try Different Validation Rules',
				elements: [
					{
						$type: 'input',
						inputType: 'text',
						id: 'username',
						name: 'username',
						label: 'Username (3-20 characters)',
						placeholder: 'Enter username',
						rules: [
							ValidationPresets.string.required('Username is required'),
							ValidationPresets.string.minLength(3, 'Minimum 3 characters'),
							ValidationPresets.string.maxLength(20, 'Maximum 20 characters'),
						],
					},
					{
						$type: 'number',
						id: 'age',
						name: 'age',
						label: 'Age (18-100)',
						placeholder: 'Enter your age',
						rules: [
							ValidationPresets.string.required('Age is required'),
							ValidationPresets.number.min(18, 'Must be at least 18'),
							ValidationPresets.number.max(100, 'Must be less than 100'),
						],
					},
					{
						$type: 'input',
						inputType: 'url',
						id: 'website',
						name: 'website',
						label: 'Website (optional)',
						placeholder: 'https://example.com',
						rules: [ValidationPresets.string.url('Please enter a valid URL')],
					},
					{
						$type: 'submit',
						id: 'validation-demo-submit',
						label: 'Submit Form',
						name: 'submit',
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
