import type { FormConfig } from '@schema-engine/forms';

/**
 * Homepage hero form: a valid submit is announced by a toast and celebrated with confetti, then the form resets.
 *
 * @remarks
 * `celebrate` is not built in. The docs register it once in `createDocsDemoActions`, and this document only names it.
 */
export const contactFormConfig = {
	id: 'contact-form',
	title: 'Contact Form',
	steps: [
		{
			id: 'contact-step',
			title: 'Contact Information',
			elements: [
				{
					id: 'email',
					name: 'email',
					$type: 'input',
					inputType: 'email',
					label: 'Email Address',
					placeholder: 'Enter your email',
					rules: [
						{ $type: 'required', message: 'Email is required' },
						{ $type: 'email', message: 'Please enter a valid email address' },
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
							$type: 'minLength',
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
			enabled: true,
			endpoint: '/api/submit-demo',
			method: 'POST',
		},
		{
			id: 'thanks',
			$type: 'show_notification',
			message: 'Message sent! Thanks for reaching out.',
			variant: 'success',
			triggers: ['form_submit_success'],
		},
		{
			id: 'party',
			$type: 'celebrate',
			triggers: ['form_submit_success'],
		},
		{
			id: 'sorry',
			$type: 'show_notification',
			message: 'Failed to send message. Please try again.',
			variant: 'error',
			triggers: ['form_submit_error'],
		},
		{
			id: 'reset-form',
			$type: 'reset',
			enabled: true,
			triggers: ['form_submit_success'],
			resetToDefaults: true,
		},
	],
} satisfies FormConfig;
