import type { FormConfig } from '@schema-engine/forms/schemas';

/**
 * Declared here so the basic-form demo and its generated snippet share one
 * source of truth (`FormConfigCode` serializes this object for the page).
 */
export const basicContactFormConfig: FormConfig = {
	id: 'basic-contact',
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
					label: 'Name',
					inputType: 'text',
					rules: [{ type: 'required', message: 'Name is required' }],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email',
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
				},
			],
		},
	],
	view: { $type: 'card' },
};
