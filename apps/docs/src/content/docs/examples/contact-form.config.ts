import type { FormConfig } from '@schema-engine/forms/schemas';

/**
 * Declared here so the contact-form demo and its generated snippet share one
 * source of truth (`FormConfigCode` serializes this object for the page).
 */
export const contactFormDemoConfig: FormConfig = {
	id: 'contact',
	title: 'Contact us',
	steps: [
		{
			id: 'details',
			title: 'Contact details',
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
					constraints: [],
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
	view: { $type: 'card' },
};
