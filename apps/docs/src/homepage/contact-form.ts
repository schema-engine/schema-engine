import type { FormConfig } from '@schema-engine/forms/schemas';

/** Shared homepage contact form — JSON preview and live engine validation use this. */
export const contactFormConfig = {
	id: 'contact-form',
	title: 'Contact Form',
	mode: 'free',
	steps: [
		{
			id: 'contact-step',
			title: 'Contact Information',
			elements: [
				{
					id: 'submission-status',
					name: 'submissionStatus',
					$type: 'submission-alert',
					showOn: ['pending', 'success'],
					pendingMessage: 'Pending Submission',
					successMessage: 'Submission Successful',
				},
				{
					id: 'email',
					name: 'email',
					$type: 'input',
					inputType: 'email',
					label: 'Email Address',
					placeholder: 'Enter your email',
					rules: [
						{ type: 'required', message: 'Email is required' },
						{ type: 'email', message: 'Please enter a valid email address' },
					],
				},
				{
					id: 'message',
					name: 'message',
					$type: 'textarea',
					label: 'Message',
					placeholder: 'Your message...',
					rules: [
						{
							type: 'minLength',
							value: 10,
							message: 'Message must be at least 10 characters long',
						},
					],
				},
				{
					$type: 'submit',
					id: 'submit',
					name: 'submit',
					label: 'Submit Form',
				},
			],
		},
	],
	actions: [
		{
			id: 'contact-submit',
			$type: 'submit',
			description: 'Submit contact form',
			successMessage: 'Message sent! Thanks for reaching out.',
			errorMessage: 'Failed to send message. Please try again.',
			enabled: true,
			endpoint: '/api/submit-demo',
			method: 'POST',
		},
		{
			id: 'reset-form',
			$type: 'reset',
			enabled: true,
			resetToDefaults: true,
		},
	],
} satisfies FormConfig;
