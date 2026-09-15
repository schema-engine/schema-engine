import type { FormConfig } from '@schema-engine/forms/schemas';

/** Multi-step onboarding wizard — view recipes and React layouts guide. */
export const viewRecipesDemoConfig: FormConfig = {
	id: 'onboarding',
	title: 'Create your account',
	view: { $type: 'wizard' },
	steps: [
		{
			id: 'account',
			title: 'Account',
			elements: [
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					inputType: 'email',
					rules: [{ type: 'required', message: 'Email is required' }],
				},
				{
					$type: 'input',
					id: 'password',
					name: 'password',
					label: 'Password',
					inputType: 'password',
					rules: [
						{ type: 'required', message: 'Password is required' },
						{ type: 'minLength', value: 8, message: 'Use at least 8 characters' },
					],
				},
			],
		},
		{
			id: 'profile',
			title: 'Profile',
			elements: [
				{
					$type: 'select',
					id: 'role',
					name: 'role',
					label: 'Role',
					placeholder: 'Select your role',
					rules: [{ type: 'required', message: 'Role is required' }],
					options: [
						{ value: 'developer', label: 'Developer' },
						{ value: 'designer', label: 'Designer' },
						{ value: 'product', label: 'Product Manager' },
					],
				},
				{
					$type: 'checkbox',
					id: 'newsletter',
					name: 'newsletter',
					label: 'Newsletter',
					description: 'Optional. Send me product updates.',
				},
			],
		},
	],
};
