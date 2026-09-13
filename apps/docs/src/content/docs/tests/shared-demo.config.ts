import type { FormConfig } from '@schema-engine/forms/schemas';

/**
 * Single source of truth for the integration-matrix demo: both the Radiant and
 * the React showcase pages import this module and render the same form.
 */
export const sharedDemoConfig: FormConfig = {
	id: 'shared-demo',
	title: 'Contact us',
	steps: [
		{
			id: 'details',
			title: 'Your details',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Full Name',
					inputType: 'text',
					rules: [{ type: 'required', message: 'Name is required' }],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					inputType: 'email',
					rules: [
						{ type: 'required', message: 'Email is required' },
						{ type: 'email', message: 'Enter a valid email' },
					],
				},
				{
					$type: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Message',
					rows: 5,
				},
			],
		},
	],
	view: { $type: 'card' },
};
