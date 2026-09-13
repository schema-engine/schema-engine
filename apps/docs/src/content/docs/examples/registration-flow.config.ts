import type { FormConfig } from '@schema-engine/forms/schemas';

/**
 * Declared here so the registration-flow demo and its generated snippet share
 * one source of truth (`FormConfigCode` serializes this object for the page).
 */
export const registrationDemoConfig: FormConfig = {
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
						{ type: 'required', message: 'Email is required' },
						{ type: 'email', message: 'Enter a valid email' },
					],
				},
			],
		},
		{
			id: 'profile',
			title: 'Profile',
			elements: [{ $type: 'input', id: 'name', name: 'name', label: 'Full name' }],
		},
	],
	actions: [
		{
			id: 'submit-registration',
			$type: 'submit',
			endpoint: '/api/register',
			method: 'POST',
			enabled: true,
		},
		{
			id: 'reset-after-success',
			$type: 'reset',
			enabled: true,
			triggers: ['form_submit_success'],
			resetToDefaults: true,
		},
	],
};
