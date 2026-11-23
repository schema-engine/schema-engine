import type { FormConfig } from '@schema-engine/forms';

/**
 * Every built-in rule family a text form needs, each with its own message.
 *
 * @remarks The React examples page renders this and the shadcn config below live and serializes each
 * into its code block from the one object, so a snippet cannot drift from its demo.
 */
export const validationDemoConfig: FormConfig = {
	id: 'validation-demo',
	title: 'Join the beta',
	description: 'Submit it empty, then fix one field at a time.',
	view: {
		$type: 'card',
		shell: { appearance: { size: 'default', surface: 'elevated' } },
		header: { align: 'center', size: 'md' },
	},
	steps: [
		{
			id: 'details',
			title: 'Join the beta',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Name',
					rules: [
						{ $type: 'required', message: 'Name is required' },
						{ $type: 'minLength', value: 2, message: 'Use at least 2 characters' },
					],
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
				{
					$type: 'input',
					id: 'website',
					name: 'website',
					label: 'Website',
					inputType: 'url',
					rules: [
						{ $type: 'required', message: 'Website is required' },
						{ $type: 'url', message: 'Enter a full URL, such as https://example.com' },
					],
				},
				{
					$type: 'input',
					id: 'postcode',
					name: 'postcode',
					label: 'Postcode',
					rules: [
						{ $type: 'required', message: 'Postcode is required' },
						{ $type: 'pattern', value: '^[0-9]{5}$', message: 'Use five digits' },
					],
				},
			],
		},
	],
};

/** A contact form made only of the shadcn registry's `input` field and `card` recipe. */
export const shadcnContactFormConfig: FormConfig = {
	id: 'shadcn-contact',
	title: 'Contact us',
	description: 'Rendered by the copied shadcn input and card recipe.',
	view: {
		$type: 'card',
		shell: { appearance: { size: 'default', surface: 'elevated' } },
		header: { align: 'center', size: 'md' },
	},
	steps: [
		{
			id: 'details',
			title: 'Contact us',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Full name',
					rules: [{ $type: 'required', message: 'Name is required' }],
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
			],
		},
	],
};
