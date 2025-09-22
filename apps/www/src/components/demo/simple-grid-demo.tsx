import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';
import type { FormConfig } from '@json-form-engine/core/schemas';
import '@json-form-engine/react/components/form/registry';
import '@json-form-engine/core/actions/debug-registry';

/**
 * Simple responsive grid demo for documentation
 */
export function SimpleGridDemo() {
	const config: FormConfig = {
		id: 'simple-grid-demo',
		mode: 'free',

		grid: {
			columns: 1,
			gap: '1rem',
			responsive: {
				default: { columns: 1, gap: '1rem' },
				md: { columns: 2, gap: '1.5rem' },
				lg: { columns: 3, gap: '2rem' },
			},
		},
		steps: [
			{
				id: 'grid-step',
				title: 'Responsive Grid Layout',
				elements: [
					{
						componentId: 'input',
						inputType: 'text',
						id: 'firstName',
						name: 'firstName',
						label: 'First Name',
						placeholder: 'John',
						rules: [ValidationPresets.string.required('First name required')],
					},
					{
						componentId: 'input',
						inputType: 'text',
						id: 'lastName',
						name: 'lastName',
						label: 'Last Name',
						placeholder: 'Doe',
						rules: [ValidationPresets.string.required('Last name required')],
					},
					{
						componentId: 'input',
						inputType: 'email',
						id: 'email',
						name: 'email',
						label: 'Email Address',
						placeholder: 'john@example.com',
						rules: [
							ValidationPresets.string.required('Email required'),
							ValidationPresets.string.email('Invalid email'),
						],
					},
					{
						componentId: 'input',
						inputType: 'tel',
						id: 'phone',
						name: 'phone',
						label: 'Phone Number',
						placeholder: '+1 (555) 123-4567',
					},
					{
						componentId: 'select',
						id: 'country',
						name: 'country',
						label: 'Country',
						placeholder: 'Select country',
						options: [
							{ value: 'us', label: 'United States' },
							{ value: 'ca', label: 'Canada' },
							{ value: 'uk', label: 'United Kingdom' },
						],
					},
					{
						componentId: 'input',
						inputType: 'text',
						id: 'city',
						name: 'city',
						label: 'City',
						placeholder: 'New York',
					},
				],
			},
		],
		actions: [
			{
				id: 'grid-demo-submit',
				type: 'submit',
				description: 'Submit responsive grid demo',
				successMessage: 'Responsive form submitted successfully! 📱💻',
				errorMessage: 'Failed to submit form. Please try again.',
				enabled: true,
				endpoint: '/api/demo-submit',
				method: 'POST',
			},
		],
	};

	return (
		<div className="border rounded-lg p-4 bg-gray-50/50">
			<p className="text-sm text-gray-600 mb-4">
				🔄 Resize your browser window to see the responsive grid in action
			</p>
			<FormRenderer config={config} />
		</div>
	);
}
