import { FormRenderer } from '@/lib/form-engine';
import type { FormConfig } from '@/lib/form-engine/types';
// Import to register components
import '@/lib/form-engine/components/form/registry';

export function ContactFormExample() {
	const config: FormConfig = {
		id: 'contact-form',
		title: 'Contact Form',
		autoGenerateSchema: true,
		mode: 'free',
		steps: [
			{
				id: 'contact-step',
				title: 'Contact Information',
				elements: [
					{
						id: 'email',
						name: 'email',
						type: 'input',
						inputType: 'email',
						label: 'Email Address',
						placeholder: 'Enter your email',
						rules: [
							{
								type: 'required',
								message: 'Email is required',
							},
						],
					},
					{
						id: 'message',
						name: 'message',
						type: 'textarea',
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
				],
			},
		],
		actions: [
			{
				id: 'contact-submit',
				type: 'submit',
				description: 'Submit contact form',
				successMessage: 'Message sent! Thanks for reaching out.',
				errorMessage: 'Failed to send message. Please try again.',
				enabled: true,
				endpoint: '/api/contact-submit',
				method: 'POST',
			},
		],
	};

	return (
		<div className="space-y-4">
			<FormRenderer config={config} />
		</div>
	);
}
