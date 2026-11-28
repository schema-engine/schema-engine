import type {
	ActionDispatchInput,
	ActionSequenceEntry,
	ParsedAction,
	ParsedActionSequence,
} from '@schema-engine/actions';
import type { FormActionTrigger } from '@/actions/index.js';
import type { ActionExecutionResult } from '@/actions/types.js';
import type { FormConfigView } from '@/lib/normalized-form-config.js';
import type { BuilderActionBaseContext } from '@/types/index.js';

type Entry = NonNullable<FormConfigView['actions']>[number];
/** The loosely typed action of a form config, which a typed action extends. */
export type FormActionConfig = Exclude<Entry, readonly unknown[]>;

type FormActionDispatch<TAction extends FormActionConfig> = (
	input: ActionDispatchInput<TAction, BuilderActionBaseContext, FormActionTrigger>,
) => Promise<Array<ActionExecutionResult & { actionId?: string; sequenceIndex?: number; groupIndex?: number }>>;

interface RunSubmissionLifecycleOptions<TAction extends FormActionConfig> {
	actions: ParsedActionSequence<TAction>;
	context: BuilderActionBaseContext | (() => BuilderActionBaseContext);
	/**
	 * Whether any action answers the trigger. A trigger nothing answers is not dispatched and builds no context.
	 *
	 * @remarks Defaults to answering every trigger.
	 */
	hasMatching?: (actions: ParsedActionSequence<TAction>, trigger: FormActionTrigger) => boolean;
	onAction?: (action: TAction, data: BuilderActionBaseContext['formData']) => void | Promise<void>;
	/**
	 * The consumer's submission callback.
	 *
	 * @remarks
	 * Runs after the submit actions and before `form_submit_success` or `form_submit_error`, and only when
	 * the actions succeeded. A rejection fails the submission, so the error and complete triggers run
	 * and the success trigger does not.
	 */
	onSubmit?: () => void | Promise<void>;
}

export type SubmissionActionResult = ActionExecutionResult & {
	actionId: string;
	sequenceIndex?: number;
	groupIndex?: number;
	status?: 'succeeded' | 'failed' | 'cancelled';
	cancellationRequested?: boolean;
};

/** Where a submission failed outside its action results: the consumer's `onSubmit` callback, or a trigger dispatch. */
export interface SubmissionFailure {
	phase: 'callback' | 'trigger';
	error: unknown;
}

export interface SubmissionLifecycleResult {
	succeeded: boolean;
	results: SubmissionActionResult[];
	/** Set when `onSubmit` rejected or a trigger dispatch failed; a failed action alone sets none. */
	failure?: SubmissionFailure;
}

function isGroup<TAction extends FormActionConfig>(
	entry: ActionSequenceEntry<ParsedAction<TAction>>,
): entry is readonly ParsedAction<TAction>[] {
	return Array.isArray(entry);
}

/**
 * Runs the form submission sequence and returns the submit action results.
 *
 * @remarks
 * The sequence is `form_submit_start`, the submit actions, `onSubmit`, then `form_submit_success` or
 * `form_submit_error`, then `form_submit_complete`. It does not reject: a rejected `onSubmit` or trigger
 * dispatch resolves unsuccessful with a `failure`, and one recovery path dispatches `form_submit_error`
 * unless that trigger was already tried, then `form_submit_complete` exactly once even when its own
 * dispatch rejects. Once `onSubmit` and `form_submit_success` have resolved the submission is saved: a
 * later failure, of `form_submit_complete`, is recorded in `failure` and leaves `succeeded` true. Failures
 * while recovering are dropped in favour of the first.
 */
export async function runSubmissionLifecycle<TAction extends FormActionConfig = FormActionConfig>(
	dispatch: FormActionDispatch<TAction>,
	{ actions, context, onAction, onSubmit, hasMatching = () => true }: RunSubmissionLifecycleOptions<TAction>,
): Promise<SubmissionLifecycleResult> {
	const currentContext = () => (typeof context === 'function' ? context() : context);
	const dispatchTrigger = async (trigger: FormActionTrigger) => {
		if (hasMatching(actions, trigger)) await dispatch({ actions, trigger, context: currentContext() });
	};
	const dispatchSubmit = async (): Promise<SubmissionActionResult[]> => {
		if (!hasMatching(actions, 'form_submit')) return [];
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

	let results: SubmissionActionResult[] = [];
	let succeeded = false;
	let failure: SubmissionFailure | undefined;
	let errorTried = false;
	let saved = false;
	const fail = (phase: SubmissionFailure['phase'], error: unknown) => {
		if (!saved) succeeded = false;
		failure ??= { phase, error };
	};
	try {
		await dispatchTrigger('form_submit_start');
		results = await dispatchSubmit();
		succeeded = results.every((result) => result.success || result.shouldContinue !== false);
		if (succeeded && onSubmit) {
			try {
				await onSubmit();
			} catch (error) {
				fail('callback', error);
			}
		}
		if (succeeded) {
			await dispatchTrigger('form_submit_success');
			saved = true;
		} else {
			errorTried = true;
			await dispatchTrigger('form_submit_error');
		}
	} catch (error) {
		fail('trigger', error);
	}
	if (!succeeded && !errorTried) {
		errorTried = true;
		try {
			await dispatchTrigger('form_submit_error');
		} catch (error) {
			fail('trigger', error);
		}
	}
	try {
		await dispatchTrigger('form_submit_complete');
	} catch (error) {
		fail('trigger', error);
	}
	return failure ? { succeeded, results, failure } : { succeeded, results };
}
