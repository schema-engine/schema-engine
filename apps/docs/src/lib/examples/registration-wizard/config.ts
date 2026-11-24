import type { FormConfig } from '@schema-engine/forms';

/**
 * The registration form both renderers render: two steps with a wizard around them.
 *
 * @remarks
 * `view.$type` names the recipe that draws the steps and the navigation. Each renderer registers a recipe of that
 * name, so the same config runs in both. Next validates the step it leaves, so the password rule is checked before
 * the profile step opens.
 */
export const registration: FormConfig = {
	id: 'registration',
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
					label: 'Email',
					inputType: 'email',
					rules: [
						{ $type: 'required', message: 'Enter your email' },
						{ $type: 'email', message: 'Enter a valid email address' },
					],
				},
				{
					$type: 'input',
					id: 'password',
					name: 'password',
					label: 'Password',
					inputType: 'password',
					rules: [
						{ $type: 'required', message: 'Choose a password' },
						{ $type: 'minLength', value: 12, message: 'Use at least 12 characters' },
					],
				},
			],
		},
		{
			id: 'profile',
			title: 'Profile',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Full name',
					rules: [{ $type: 'required', message: 'Enter your name' }],
				},
				{
					$type: 'select',
					id: 'role',
					name: 'role',
					label: 'Role',
					placeholder: 'Choose your role',
					options: [
						{ value: 'developer', label: 'Developer' },
						{ value: 'designer', label: 'Designer' },
						{ value: 'product', label: 'Product manager' },
					],
					rules: [{ $type: 'required', message: 'Choose your role' }],
				},
			],
		},
	],
	actions: [
		{
			id: 'created',
			$type: 'show_notification',
			message: 'Account created. Welcome aboard.',
			variant: 'success',
			triggers: ['form_submit_success'],
		},
	],
};
