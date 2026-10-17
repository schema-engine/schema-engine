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

/** A `form_submit` result tagged with the configured action that produced it. */
export type SubmissionActionResult = ActionExecutionResult & { actionId: string };

export interface SubmissionLifecycleResult {
	succeeded: boolean;
	results: SubmissionActionResult[];
}

/**
 * Runs the shared form submission action triggers and returns the submit action results.
 *
 * @remarks
 * Pass a context factory when each trigger needs a fresh form-state snapshot.
 * Submit actions are dispatched one at a time so each result carries its action id;
 * an action that does not run on `form_submit` contributes no result.
 */
export async function runSubmissionLifecycle(
	dispatch: FormActionDispatch,
	{ actions, context, onAction }: RunSubmissionLifecycleOptions,
): Promise<SubmissionLifecycleResult> {
	const currentContext = () => (typeof context === 'function' ? context() : context);
	const dispatchTrigger = (trigger: FormActionTrigger) => dispatch({ actions, trigger, context: currentContext() });
	const dispatchSubmit = async (): Promise<SubmissionActionResult[]> => {
		const submitContext = currentContext();
		const results: SubmissionActionResult[] = [];
		for (const action of actions) {
			const [result] = await dispatch({ actions: [action], trigger: 'form_submit', context: submitContext });
			if (!result) continue;
			let tagged: SubmissionActionResult = { ...result, actionId: action.id };
			if (tagged.success && onAction) {
				try {
					await onAction(action, submitContext.formData);
				} catch (error) {
					tagged = {
						actionId: action.id,
						success: false,
						shouldContinue: false,
						error: error instanceof Error ? error.message : String(error),
					};
				}
			}
			results.push(tagged);
			if (!tagged.success && tagged.shouldContinue === false) break;
		}
		return results;
	};

	await dispatchTrigger('form_submit_start');
	const results = await dispatchSubmit();
	const succeeded = results.every((result) => result.success || result.shouldContinue !== false);
	await dispatchTrigger(succeeded ? 'form_submit_success' : 'form_submit_error');
	await dispatchTrigger('form_submit_complete');

	return { succeeded, results };
}
