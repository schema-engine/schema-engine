import type { FormConfig } from '@schema-engine/forms/schemas';

/**
 * Declared here so the sequential-actions demo and its generated snippet share
 * one source of truth (`FormConfigCode` serializes this object for the page).
 */
export const sequentialActionsDemoConfig: FormConfig = {
	id: 'action-demo',
	steps: [
		{
			id: 'details',
			title: 'Details',
			elements: [{ $type: 'input', id: 'email', name: 'email', label: 'Email', inputType: 'email' }],
		},
	],
	actions: [
		{
			id: 'submit',
			$type: 'submit',
			endpoint: '/api/submit',
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
