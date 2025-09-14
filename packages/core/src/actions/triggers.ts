import { z } from 'zod';

/**
 * Action Triggers
 *
 * Events that can trigger action execution.
 * Actions can respond to one or more triggers, and some triggers form lifecycle chains.
 *
 * Lifecycle Chains:
 * - Submit: form_submit → submit_success/submit_error → submit_complete
 * - Step: step_change → step_enter/step_leave
 *
 * @form_start - When form is initialized
 * @form_change - When any form field changes
 * @form_submit - When form submission is initiated
 * @step_change - When navigating between steps in multi-step forms
 * @step_submit - When submitting a specific step
 * @step_enter - When entering a specific step
 * @step_leave - When leaving a specific step
 * @step_view - When a step becomes visible (for analytics)
 * @manual_save - When user explicitly saves progress (e.g., "Save Draft" button)
 * @manual_reset - When user explicitly resets form (e.g., "Reset" button)
 * @submit_start - When submit process begins (internal lifecycle)
 * @submit_success - When submit completes successfully (internal lifecycle)
 * @submit_error - When submit fails (internal lifecycle)
 * @submit_complete - When submit process finishes, regardless of outcome (internal lifecycle)
 */
export const ActionTriggerSchema = z.enum([
	'form_start',
	'form_change',
	'form_submit',
	'submit_start',
	'submit_success',
	'submit_error',
	'submit_complete',
	'step_change',
	'step_submit',
	'step_enter',
	'step_leave',
	'step_view',
	'manual_save',
	'manual_reset',
]);

export type ActionTrigger = z.infer<typeof ActionTriggerSchema>;