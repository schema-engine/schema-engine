import type { FormConfig } from '@schema-engine/forms';

/** Single-step contact card with two half-width fields. */
export const contactCard: FormConfig = {
	id: 'contact-card',
	title: 'Contact us',
	description: 'We reply within one working day.',
	className: 'contact-card',
	view: { $type: 'card' },
	steps: [
		{
			id: 'details',
			title: 'Your details',
			elements: [
				{
					$type: 'input',
					id: 'first',
					name: 'first',
					label: 'First name',
					grid: { width: 'half' },
					rules: [{ $type: 'required', message: 'First name is required' }],
				},
				{
					$type: 'input',
					id: 'last',
					name: 'last',
					label: 'Last name',
					grid: { width: 'half' },
					rules: [{ $type: 'required', message: 'Last name is required' }],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [
						{ $type: 'required', message: 'Email is required' },
						{ $type: 'email', message: 'Enter a valid email' },
					],
				},
				{ $type: 'textarea', id: 'message', name: 'message', label: 'Message', rows: 4 },
			],
		},
	],
};
