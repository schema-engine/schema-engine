import { FormRenderer } from '@/lib/form-engine';
import type { FormConfig } from '@/lib/form-engine/types';
import { ValidationPresets } from '@/lib/form-engine/validation';
// Import to register components
import '@/components/form/registry';

/**
 * Simple input field demo for documentation
 */
export function SimpleInputDemo() {
	const config: FormConfig = {
		id: 'simple-input-demo',
		mode: 'free',
		autoGenerateSchema: true,
		steps: [
			{
				id: 'demo-step',
				title: 'Input Fields',
				fields: [
					{
						type: 'input',
						inputType: 'text',
						id: 'name',
						name: 'name',
						label: 'Your Name',
						placeholder: 'Enter your name',
						validation: [
							ValidationPresets.required('Name is required'),
							ValidationPresets.minLength(2, 'Must be at least 2 characters'),
						],
					},
					{
						type: 'input',
						inputType: 'email',
						id: 'email',
						name: 'email',
						label: 'Email',
						placeholder: 'your@email.com',
						validation: [
							ValidationPresets.required('Email is required'),
							ValidationPresets.email('Please enter a valid email'),
						],
					},
				],
			},
		],
		actions: [
			{
				id: 'demo-submit',
				type: 'submit',
				description: 'Submit demo form',
				successMessage: 'Form submitted successfully! 🎉',
				errorMessage: 'Failed to submit form. Please try again.',
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
