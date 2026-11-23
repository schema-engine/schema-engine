import type { FormConfig } from '@schema-engine/forms';

/** Contact form with conditional fields — constraints example. */
export const contactFormDemoConfig: FormConfig = {
	id: 'contact',
	title: 'Contact us',
	description: 'Send a message with conditional fields.',
	steps: [
		{
			id: 'details',
			title: 'Contact us',
			elements: [
				{
					$type: 'select',
					id: 'subject',
					name: 'subject',
					label: 'Subject',
					options: [
						{ value: 'general', label: 'General question' },
						{ value: 'support', label: 'Technical support' },
					],
					rules: [{ $type: 'required', message: 'Subject is required' }],
				},
				{
					$type: 'input',
					id: 'ticket',
					name: 'ticket',
					label: 'Support ticket number',
					constraints: [{ field: 'subject', operator: 'equals', value: 'support', $type: 'show' }],
					rules: [{ $type: 'required', message: 'Support ticket number is required' }],
				},
				{
					$type: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Message',
					rules: [{ $type: 'required', message: 'Message is required' }],
				},
			],
		},
	],
	view: {
		$type: 'card',
		shell: { appearance: { size: 'default', surface: 'elevated' } },
		header: { align: 'center', size: 'md' },
	},
};
