import type { FormConfig } from '@schema-engine/forms/schemas';

/**
 * Simple contact form on a card shell — shared by getting-started guides
 * and the basic-form example.
 *
 * @remarks Pages pass this object to live previews and `FormConfigCode` so demos
 * and snippets cannot drift.
 */
export const basicContactFormConfig: FormConfig = {
	id: 'basic-contact',
	title: 'Contact Us',
	description: 'Get in touch with our team',
	steps: [
		{
			id: 'details',
			title: 'Your Information',
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
						{ type: 'email', message: 'Invalid email format' },
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
	view: {
		$type: 'card',
		shell: { appearance: { size: 'default', surface: 'elevated' } },
	},
};
