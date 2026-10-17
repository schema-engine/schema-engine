import * as z from 'zod/mini';

/**
 * Action Triggers
 *
 * Events that can trigger action execution.
 * Actions can respond to one or more triggers, and some triggers form lifecycle chains.
 *
 * Lifecycle Chains:
 * - Submit: form_submit → form_submit_start → form_submit_success/form_submit_error → form_submit_complete
 * - Step: step_leave → step_change → step_enter
 *
 * @form_mount - When form is initialized
 * @form_change - When any form field changes
 * @form_submit - When form submission is initiated
 * @step_change - When navigating between steps in multi-step forms
 * @step_enter - When entering a specific step
 * @step_leave - When leaving a specific step
 * @form_submit_start - When submit process begins (after validation, before network request)
 * @form_submit_success - When submit completes successfully (internal lifecycle)
 * @form_submit_error - When submit fails (internal lifecycle)
 * @form_submit_complete - When submit process finishes, regardless of outcome (internal lifecycle)
 */
export const FormActionTriggerSchema = z.enum([
	'form_mount',
	'form_change',
	'form_submit',
	'form_submit_start',
	'form_submit_success',
	'form_submit_error',
	'form_submit_complete',
	'step_change',
	'step_enter',
	'step_leave',
]);

export type FormActionTrigger = z.infer<typeof FormActionTriggerSchema>;
