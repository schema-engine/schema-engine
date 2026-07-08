import type { FormConfig } from '@schema-engine/forms/schemas';
import { ValidationPresets } from '@schema-engine/forms/schemas/validation';
import '@/lib/form-engine-setup';

/**
 * Interactive demo form configuration
 */
export const demoFormConfig: FormConfig = {
	id: 'demo-form',
	title: 'Interactive Form Demo',
	description: 'Try out different field types and configurations',

	mode: 'free',
	steps: [
		{
			id: 'demo-step',
			title: 'Demo Form',
			description: 'Fill out the form below',
			elements: [
				{
					$type: 'input',
					inputType: 'text',
					id: 'name',
					name: 'name',
					label: 'Full Name',
					placeholder: 'Enter your full name',
					rules: [
						ValidationPresets.string.minLength(2, 'Name must be at least 2 characters'),
						ValidationPresets.string.maxLength(50, 'Name cannot exceed 50 characters'),
					],
				},
				{
					$type: 'input',
					inputType: 'email',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					placeholder: 'Enter your email',
					rules: [ValidationPresets.string.email('Please enter a valid email address')],
				},
				{
					$type: 'number',
					id: 'age',
					name: 'age',
					label: 'Age',
					placeholder: 'Enter your age',
					rules: [
						ValidationPresets.number.min(18, 'Must be at least 18 years old'),
						ValidationPresets.number.max(120, 'Age must be realistic'),
					],
				},
				{
					$type: 'input',
					inputType: 'url',
					id: 'website',
					name: 'website',
					label: 'Website (Optional)',
					placeholder: 'https://example.com',
					rules: [ValidationPresets.string.url('Please enter a valid URL')],
				},
				{
					$type: 'textarea',
					id: 'bio',
					name: 'bio',
					label: 'Bio',
					placeholder: 'Tell us about yourself...',
					rows: 4,
					rules: [ValidationPresets.string.maxLength(500, 'Bio cannot exceed 500 characters')],
				},
				{
					$type: 'select',
					id: 'country',
					name: 'country',
					label: 'Country',
					placeholder: 'Select your country',
					rules: [{ type: 'required', message: 'Please select your country' }],
					options: [
						{ value: 'us', label: 'United States' },
						{ value: 'ca', label: 'Canada' },
						{ value: 'uk', label: 'United Kingdom' },
						{ value: 'de', label: 'Germany' },
						{ value: 'fr', label: 'France' },
						{ value: 'jp', label: 'Japan' },
						{ value: 'au', label: 'Australia' },
					],
				},
				{
					$type: 'checkbox',
					id: 'newsletter',
					name: 'newsletter',
					label: 'Subscribe to newsletter',
				},
				{
					$type: 'checkbox',
					id: 'terms',
					name: 'terms',
					label: 'I agree to the terms and conditions',
					rules: [{ type: 'required', message: 'You must accept the terms and conditions' }],
				},
				{
					$type: 'submit',
					label: 'Submit Form',
					name: 'submit',
				},
			],
		},
	],
	actions: [
		{
			id: 'demo-form-submit',
			$type: 'submit',
			description: 'Submit demo form',
			endpoint: '/api/submit-demo',
			method: 'POST',
			successMessage: 'Message sent successfully!',
			errorMessage: 'Failed to send message. Please try again.',
			enabled: true,
		},
		{
			id: 'reset-after-success',
			$type: 'reset',
			enabled: true,
			triggers: ['form_submit_success'],
			resetToDefaults: true,
		},
	],
};
