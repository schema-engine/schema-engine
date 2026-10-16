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
	context: BuilderActionBaseContext | (() => BuilderActionBaseContext);
	onAction?: (action: FormActionConfig, data: BuilderActionBaseContext['formData']) => void | Promise<void>;
}

export interface SubmissionLifecycleResult {
	succeeded: boolean;
	results: ActionExecutionResult[];
}

/**
 * Runs the shared form submission action triggers and returns the submit action results.
 *
 * @remarks Pass a context factory when each trigger needs a fresh form-state snapshot.
 */
export async function runSubmissionLifecycle(
	dispatch: FormActionDispatch,
	{ actions, context, onAction }: RunSubmissionLifecycleOptions,
): Promise<SubmissionLifecycleResult> {
	const dispatchTrigger = async (trigger: FormActionTrigger): Promise<ActionExecutionResult[]> => {
		const currentContext = typeof context === 'function' ? context() : context;
		if (trigger !== 'form_submit' || !onAction) {
			return dispatch({ actions, trigger, context: currentContext });
		}

		const results: ActionExecutionResult[] = [];
		for (const action of actions) {
			const actionResults = await dispatch({ actions: [action], trigger, context: currentContext });
			if (actionResults[0]?.success) {
				try {
					await onAction(action, currentContext.formData);
				} catch (error) {
					actionResults[0] = {
						success: false,
						shouldContinue: false,
						error: error instanceof Error ? error.message : String(error),
					};
				}
			}
			results.push(...actionResults);
			if (actionResults.some((result) => !result.success && result.shouldContinue === false)) break;
		}
		return results;
	};

	await dispatchTrigger('form_submit_start');
	const results = await dispatchTrigger('form_submit');
	const succeeded = results.every((result) => result.success || result.shouldContinue !== false);
	await dispatchTrigger(succeeded ? 'form_submit_success' : 'form_submit_error');
	await dispatchTrigger('form_submit_complete');

	return { succeeded, results };
}
