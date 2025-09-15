import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';
import type { FormConfig } from '@json-form-engine/core/schemas';
import '@json-form-engine/react/components/form/registry';

/**
 * Simple conditional logic demo - show/hide field based on selection
 */
export function SimpleConditionalDemo() {
	const config: FormConfig = {
		id: 'simple-conditional-demo',
		mode: 'free',
		
		steps: [
			{
				id: 'conditional-step',
				title: 'Conditional Fields Example',
				elements: [
					{
						componentId: 'select',
						id: 'hasCompany',
						name: 'hasCompany',
						label: 'Do you have a company?',
						placeholder: 'Select option',
						rules: [ValidationPresets.required('Please select an option')],
						options: [
							{ value: 'yes', label: 'Yes, I have a company' },
							{ value: 'no', label: "No, I'm an individual" },
						],
					},
					{
						componentId: 'input',
						inputType: 'text',
						id: 'companyName',
						name: 'companyName',
						label: 'Company Name',
						placeholder: 'Enter your company name',
						rules: [ValidationPresets.required('Company name is required')],
						constraints: [
							{
								field: 'hasCompany',
								operator: 'equals',
								value: 'yes',
								action: 'show',
							},
						],
					},
				],
			},
		],
		actions: [
			{
				id: 'conditional-demo-submit',
				type: 'submit',
				description: 'Submit conditional demo',
				successMessage: 'Conditional form submitted successfully! 🚀',
				errorMessage: 'Failed to submit form. Please try again.',
				enabled: true,
				endpoint: '/api/demo-submit',
				method: 'POST',
			},
		],
	};

	return (
		<div className="border rounded-lg p-4 bg-gray-50/50">
			<p className="text-sm text-gray-600 mb-4">💡 Select "Yes" to see the company name field appear</p>
			<FormRenderer config={config} />
		</div>
	);
}
