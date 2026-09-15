import type { FormConfig } from '@schema-engine/forms/schemas';

/** Contact form with conditional fields and responsive grid — constraints example. */
export const contactFormDemoConfig: FormConfig = {
	id: 'contact',
	title: 'Contact us',
	description: 'Send a message with conditional fields and a responsive layout.',
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
					rules: [{ type: 'required', message: 'Subject is required' }],
				},
				{
					$type: 'input',
					id: 'ticket',
					name: 'ticket',
					label: 'Support ticket number',
					constraints: [{ field: 'subject', operator: 'equals', value: 'support', action: 'show' }],
					rules: [{ type: 'required', message: 'Support ticket number is required' }],
				},
				{
					$type: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Message',
					grid: { column: '1 / -1' },
					rules: [{ type: 'required', message: 'Message is required' }],
				},
			],
		},
	],
	grid: {
		columns: 2,
		gap: '1rem',
		responsive: { default: { columns: 1 }, md: { columns: 2 } },
	},
	view: {
		$type: 'card',
		shell: { padding: 'md', shadowSize: 'md' },
		header: { align: 'center', size: 'md' },
	},
};
