import type { ActionDispatchInput, ActionExecutionResult, ActionSequenceEntry } from '@schema-engine/actions';
import type { FormActionTrigger } from '@/actions';
import type { FormConfigView } from '@/lib/normalized-form-config';
import type { BuilderActionBaseContext } from '@/types';

type Entry = NonNullable<FormConfigView['actions']>[number];
type FormActionConfig = Exclude<Entry, readonly unknown[]>;

type FormActionDispatch = (
	input: ActionDispatchInput<FormActionConfig, BuilderActionBaseContext, FormActionTrigger>,
) => Promise<Array<ActionExecutionResult & { actionId?: string; sequenceIndex?: number; groupIndex?: number }>>;

interface RunSubmissionLifecycleOptions {
	actions: readonly ActionSequenceEntry<FormActionConfig>[];
	context: BuilderActionBaseContext | (() => BuilderActionBaseContext);
	onAction?: (action: FormActionConfig, data: BuilderActionBaseContext['formData']) => void | Promise<void>;
}

export type SubmissionActionResult = ActionExecutionResult & {
	actionId: string;
	sequenceIndex?: number;
	groupIndex?: number;
	status?: 'succeeded' | 'failed' | 'cancelled';
	cancellationRequested?: boolean;
};

export interface SubmissionLifecycleResult {
	succeeded: boolean;
	results: SubmissionActionResult[];
}

function isGroup(entry: ActionSequenceEntry<FormActionConfig>): entry is readonly FormActionConfig[] {
	return Array.isArray(entry);
}

/** Runs the shared form submission action triggers and returns the submit action results. */
export async function runSubmissionLifecycle(
	dispatch: FormActionDispatch,
	{ actions, context, onAction }: RunSubmissionLifecycleOptions,
): Promise<SubmissionLifecycleResult> {
	const currentContext = () => (typeof context === 'function' ? context() : context);
	const dispatchTrigger = (trigger: FormActionTrigger) => dispatch({ actions, trigger, context: currentContext() });
	const dispatchSubmit = async (): Promise<SubmissionActionResult[]> => {
		const submitContext = currentContext();
		const results: SubmissionActionResult[] = [];
		for (const [sequenceIndex, entry] of actions.entries()) {
			const actionsInEntry = isGroup(entry) ? entry : [entry];
			const dispatched = await dispatch({ actions: [entry], trigger: 'form_submit', context: submitContext });
			for (const result of dispatched) {
				const action = isGroup(entry)
					? result.groupIndex !== undefined
						? entry[result.groupIndex]
						: actionsInEntry.find((candidate) => candidate.id === result.actionId)
					: entry;
				if (!action) throw new Error('A grouped action result must identify its action.');
				let tagged: SubmissionActionResult = {
					...result,
					actionId: action.id,
					...(result.sequenceIndex === undefined ? {} : { sequenceIndex }),
				};
				if (result.success && onAction && action) {
					try {
						await onAction(action, submitContext.formData);
					} catch (error) {
						tagged = {
							...tagged,
							...(tagged.status ? { status: 'failed' as const } : {}),
							success: false,
							shouldContinue: false,
							error: error instanceof Error ? error.message : String(error),
							cause: error,
						};
					}
				}
				results.push(tagged);
			}
			if (results.some((result) => !result.success && result.shouldContinue === false)) break;
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
