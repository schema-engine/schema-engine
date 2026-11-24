import type { FormConfig } from '@schema-engine/forms';

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
