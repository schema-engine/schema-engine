import { FormRenderer } from '@/lib/form-engine';
import type { FormConfig } from '@/lib/form-engine/types';
import { ValidationPresets } from '@/lib/form-engine/validation';
// Import to register components
import '@/lib/form-engine/components/form/registry';

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
				elements: [
					{
						type: 'input',
						inputType: 'text',
						id: 'name',
						name: 'name',
						label: 'Your Name',
						placeholder: 'Enter your name',
						rules: [
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
						rules: [
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
		<div className="border rounded-lg p-4">
			<FormRenderer config={config} />
		</div>
	);
}
