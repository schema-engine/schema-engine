import { FormRenderer } from '@schema-engine/forms-react/components/internals/form-renderer';
import { FormEngineProvider } from '@schema-engine/forms-react/components/adapter-provider';
import { rhfAdapter } from '@schema-engine/forms-react/adapters/rhf';
import { formEngine } from '@/lib/form-engine-setup';
import type { FormConfig } from '@schema-engine/forms/schemas';

export function ContactFormExample() {
	const config: FormConfig = {
		id: 'contact-form',
		title: 'Contactorm',

		mode: 'free',
		steps: [
			{
				id: 'contact-step',
				title: 'Contact Information',
				elements: [
					{
						$type: 'input',
						id: 'email',
						name: 'email',
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
						$type: 'textarea',
						id: 'message',
						name: 'message',
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
				$type: 'submit',
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
		<FormEngineProvider engine={formEngine} adapter={rhfAdapter}>
			<div className="space-y-4">
				<FormRenderer config={config} />
			</div>
		</FormEngineProvider>
	);
}
