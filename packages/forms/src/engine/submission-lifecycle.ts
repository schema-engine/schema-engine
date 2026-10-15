import type { ActionDispatchInput, ActionExecutionResult } from '@schema-engine/actions';
import type { FormActionTrigger } from '@/actions';
import type { FormConfigView } from '@/lib/normalized-form-config';
type FormActionConfig = NonNullable<FormConfigView['actions']>[number];
import type { BuilderActionBaseContext } from '@/types';

type FormActionDispatch = (
	input: ActionDispatchInput<FormActionConfig, BuilderActionBaseContext, FormActionTrigger>,
) => Promise<ActionExecutionResult[]>;

interface RunSubmissionLifecycleOptions {
	actions: readonly FormActionConfig[];
	context: BuilderActionBaseContext;
}

export interface SubmissionLifecycleResult {
	succeeded: boolean;
	results: ActionExecutionResult[];
}

/** Runs the shared form submission action triggers and returns the submit action results. */
export async function runSubmissionLifecycle(
	dispatch: FormActionDispatch,
	{ actions, context }: RunSubmissionLifecycleOptions,
): Promise<SubmissionLifecycleResult> {
	const dispatchTrigger = (trigger: FormActionTrigger) => dispatch({ actions, trigger, context });

	await dispatchTrigger('form_submit_start');
	const results = await dispatchTrigger('form_submit');
	const succeeded = results.every((result) => result.success || result.shouldContinue !== false);
	await dispatchTrigger(succeeded ? 'form_submit_success' : 'form_submit_error');
	await dispatchTrigger('form_submit_complete');

	return { succeeded, results };
}
