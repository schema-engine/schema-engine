import type { FormConfig } from '@schema-engine/forms/schemas';

/**
 * Submit, notification, and reset actions in sequence.
 *
 * @remarks Single-step `card` view supplies the submit affordance via the recipe
 * actions slot; lifecycle plugins run from the configured `actions` array.
 */
export const sequentialActionsDemoConfig: FormConfig = {
	id: 'action-demo',
	title: 'Action pipeline',
	description: 'Submit once to run the configured plugins in order.',
	steps: [
		{
			id: 'details',
			title: 'Action pipeline',
			elements: [
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [{ type: 'required', message: 'Email is required' }],
				},
			],
		},
	],
	view: {
		$type: 'card',
		shell: { appearance: { size: 'default', surface: 'elevated' } },
		header: { align: 'center', size: 'md' },
	},
	actions: [
		{
			id: 'submit',
			$type: 'submit',
			endpoint: '/api/submit-demo',
			method: 'POST',
			enabled: true,
		},
		{
			id: 'notify',
			$type: 'show_notification',
			enabled: true,
			message: 'Submitted successfully',
			variant: 'success',
			triggers: ['form_submit_success'],
		},
		{
			id: 'reset',
			$type: 'reset',
			enabled: true,
			triggers: ['form_submit_success'],
			resetToDefaults: true,
		},
	],
};
