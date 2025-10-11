import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import { FormEngineProvider } from '@json-form-engine/react/components/adapter-provider';
import { rhfAdapter } from '@json-form-engine/react/adapters/rhf';
import { formEngine } from '@/lib/form-engine-setup';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';
import type { FormConfig } from '@json-form-engine/core/schemas';
import '@/lib/form-engine-setup';

/**
 * Simple input field demo for documentation
 */
export function SimpleInputDemo() {
	const config: FormConfig = {
		id: 'simple-input-demo',
		mode: 'free',
		steps: [
			{
				id: 'demo-step',
				title: 'Input Fields',
				elements: [
					{
						__id: 'input',
						inputType: 'text',
						id: 'name',
						name: 'name',
						label: 'Your Name',
						placeholder: 'Enter your name',
						rules: [
							ValidationPresets.string.required('Name is required'),
							ValidationPresets.string.minLength(2, 'Must be at least 2 characters'),
						],
					},
					{
						__id: 'input',
						inputType: 'email',
						id: 'email',
						name: 'email',
						label: 'Email',
						placeholder: 'your@email.com',
						rules: [
							ValidationPresets.string.required('Email is required'),
							ValidationPresets.string.email('Please enter a valid email'),
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
		<FormEngineProvider engine={formEngine} adapter={rhfAdapter}>
			<div className="border rounded-lg p-4">
				<FormRenderer config={config} />
			</div>
		</FormEngineProvider>
	);
}
