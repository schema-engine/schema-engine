import type { FormConfig } from '@schema-engine/forms';

/** A form that picks the host `tone` axis. */
export const brandForm: FormConfig = {
	id: 'brand-form',
	title: 'Newsletter',
	className: 'brand-form',
	appearance: { tone: 'brand' },
	view: { $type: 'card' },
	steps: [
		{
			id: 'signup',
			title: 'Stay in touch',
			elements: [
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [{ $type: 'email', message: 'Enter a valid email' }],
				},
				{ $type: 'checkbox', id: 'weekly', name: 'weekly', label: 'Weekly digest' },
			],
		},
	],
};
