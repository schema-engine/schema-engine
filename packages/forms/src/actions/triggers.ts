import * as z from 'zod/mini';

/**
 * Action Triggers
 *
 * Events that can trigger action execution.
 * Actions can respond to one or more triggers, and some triggers form lifecycle chains.
 *
 * Lifecycle Chains:
 * - Submit: form_submit_start → form_submit → form_submit_success/form_submit_error → form_submit_complete
 * - Step: step_leave → step_change → step_enter
 *
 * @remarks
 * The step triggers fire only when the current step changes: by `next`, `back` or `goTo`, by the move to the
 * first step with an error after a failed or server-rejected submission, and by the move off a step that
 * became skipped. A reset fires none. Step actions cannot block a move; their failures are reported through
 * `onActionResults`. `step_leave` runs while the step being left is current and `step_change` and
 * `step_enter` once the new step is.
 *
 * @form_mount - When the form's runtime mounts, once
 * @form_change - When the form's values change
 * @form_submit - When the submit actions run, after validation passed
 * @step_change - When the current step has changed
 * @step_enter - When a step has become the current step
 * @step_leave - When the current step is about to change
 * @form_submit_start - When submit process begins (after validation, before the submit actions)
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
