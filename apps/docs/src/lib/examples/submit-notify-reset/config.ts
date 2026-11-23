import type { FormConfig } from '@schema-engine/forms';

/**
 * A newsletter signup that sends itself, tells the visitor how it went and clears itself.
 *
 * @remarks
 * `actions` are plain data, so the server could send them with the rest of the config. Each entry runs on the
 * triggers it names, in the order it is listed: `submit` answers `form_submit` by default, and the other entries
 * run after it succeeded or failed. The values passed validation before any of them ran.
 */
export const newsletter: FormConfig = {
	id: 'newsletter',
	title: 'Get the monthly update',
	steps: [
		{
			id: 'signup',
			title: 'Get the monthly update',
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
				{ $type: 'submit', id: 'subscribe', name: 'subscribe', label: 'Subscribe' },
			],
		},
	],
	actions: [
		{ id: 'send', $type: 'submit', endpoint: '/api/subscriptions', method: 'POST' },
		{
			id: 'thanks',
			$type: 'show_notification',
			message: 'You are subscribed. Look out for the next update.',
			variant: 'success',
			triggers: ['form_submit_success'],
		},
		{ id: 'clear', $type: 'reset', resetToDefaults: true, triggers: ['form_submit_success'] },
		{
			id: 'sorry',
			$type: 'show_notification',
			message: 'We could not subscribe you. Try again in a moment.',
			variant: 'error',
			triggers: ['form_submit_error'],
		},
	],
};
