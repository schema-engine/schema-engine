import type { RuntimeAction } from './runtime-action';
import { logger } from '@/lib/logger';
import { useCallback, useState, type BaseSyntheticEvent } from 'react';
import type { FormStateContainer, FormSubmissionIssue, FormSubmitResult } from '@schema-engine/forms/state-container';
import type { FieldRegistry } from '@/hooks/form-state/field-registry';
import type { SubmissionStore } from '@/hooks/form-state/submission-store';
import type { FormSubmitHelpers, FormValues } from '@/hooks/form-state/types';
import {
	collectStepActions,
	createSubmissionGuard,
	runSubmissionLifecycle,
	type BuilderActionBaseContext,
	type FormActionTrigger,
	type SubmissionActionResult,
} from '@schema-engine/forms';
import type { ActionSequenceEntry } from '@schema-engine/actions';
import type { ActionDispatchInput, ActionDispatchResult, ActionExecutionResult } from '@schema-engine/forms/actions';

interface UseFormSubmitHandlerOptions<TAction extends RuntimeAction> {
	container: FormStateContainer;
	submission: SubmissionStore;
	fetch: FormSubmitHelpers['fetch'];
	fields: FieldRegistry;
	config: {
		readonly actions?: readonly ActionSequenceEntry<TAction>[];
		readonly steps: readonly { readonly actions?: readonly ActionSequenceEntry<TAction>[] }[];
	};
	buildActionContext: (values?: FormValues) => BuilderActionBaseContext;
	hasMatching: (actions: readonly ActionSequenceEntry<TAction>[], trigger: FormActionTrigger) => boolean;
	getCurrentStep: () => number;
	onSubmit?: (data: FormValues, helpers: FormSubmitHelpers) => void | Promise<void>;
	onAction?: (action: TAction, data: FormValues) => void | Promise<void>;
	onActionResults?: (results: readonly SubmissionActionResult[], trigger: FormActionTrigger) => void | Promise<void>;
	dispatchActions: (
		input: ActionDispatchInput<TAction, BuilderActionBaseContext, FormActionTrigger>,
		suppressSubmitReport?: boolean,
	) => Promise<ActionDispatchResult[]>;
}

export type SubmissionContextValue<TAction extends RuntimeAction = RuntimeAction> = {
	executeAction: (action: TAction) => Promise<ActionExecutionResult>;
};

type PassedSubmission = Extract<FormSubmitResult, { outcome: 'passed' }>;

/** A submission failure, in the shape of an issue so the form's one formatter words it. */
function submissionIssue(
	type: string,
	{ actionId, message }: { actionId?: string; message?: string } = {},
): FormSubmissionIssue {
	return {
		type,
		source: 'submission',
		...(actionId === undefined ? {} : { params: { actionId } }),
		...(message ? { message } : {}),
	};
}

const errorMessage = (error: unknown): string | undefined => (error instanceof Error ? error.message : undefined);

/**
 * Handles form submission with full action lifecycle support.
 * Manages the complete submission flow including:
 * - the guard, which ignores a submit while one runs, and the container's `submit()`, which validates the
 *   whole form and says how that ended
 * - on `passed`: form_submit_start, form_submit, form_submit_success/error, form_submit_complete triggers,
 *   with `onSubmit` given exactly the values that passed and the way to hand back the server's answer; on
 *   `invalid`: the first error's control is focused; on `overtaken`: nothing, since an edit outran the check and
 *   the user can submit again
 * - Error handling and state management
 * - User-provided onSubmit and onAction callbacks
 *
 * @remarks
 * Callbacks receive the frozen normalized action snapshot. React reports no native validity of its own, so
 * the check runs on the container's rules.
 */
export function useFormSubmitHandler<TAction extends RuntimeAction>({
	container,
	submission,
	fetch,
	fields,
	config,
	buildActionContext,
	hasMatching,
	getCurrentStep,
	onSubmit,
	onAction,
	onActionResults,
	dispatchActions,
}: UseFormSubmitHandlerOptions<TAction>): {
	submitEvent: (event?: BaseSyntheticEvent) => Promise<void>;
} & SubmissionContextValue<TAction> {
	const [guard] = useState(createSubmissionGuard);

	const executeAction = useCallback(
		async (action: TAction) => {
			submission.begin();
			return dispatchActions({ actions: [action], trigger: 'form_submit', context: buildActionContext() })
				.then(async (results) => {
					const result = results[0];
					if (!result) {
						submission.settle('error', {
							failures: [submissionIssue('noResult', { actionId: action.id })],
						});
						return { success: false };
					}

					if (result.success) {
						try {
							await onAction?.(action, container.getSnapshot().values);
							submission.settle('success');
						} catch (actionError) {
							logger.error('Action callback failed:', actionError);
							throw actionError;
						}
					} else {
						submission.settle('error', {
							failures: [submissionIssue('actionFailed', { actionId: action.id, message: result.error })],
						});
					}
					return result;
				})
				.catch((error) => {
					submission.settle('error', {
						failures: [
							submissionIssue('actionFailed', { actionId: action.id, message: errorMessage(error) }),
						],
					});
					return { success: false, error: errorMessage(error) };
				});
		},
		[container, onAction, dispatchActions, buildActionContext, submission],
	);

	const handleSubmit = useCallback(
		async ({ values, setServerErrors }: PassedSubmission) => {
			const { succeeded, results, failure } = await runSubmissionLifecycle(
				(input) => dispatchActions(input, true),
				{
					actions: collectStepActions(config, getCurrentStep()),
					context: () => buildActionContext(values),
					hasMatching,
					onAction,
					onSubmit: () => onSubmit?.(values, { setServerErrors, fetch }),
				},
			);

			try {
				if (results.length) await onActionResults?.(results, 'form_submit');
			} catch (error) {
				logger.error('Action results callback failed:', error);
			}

			if (succeeded) {
				if (failure) logger.error('Form submission completed with a failing trigger:', failure.error);
				submission.settle('success', { counted: true });
				return;
			}
			if (failure) {
				logger.error('Form submission failed:', failure.error);
				submission.settle('error', {
					failures: [
						submissionIssue(failure.phase === 'callback' ? 'callbackFailed' : 'triggerFailed', {
							message: errorMessage(failure.error),
						}),
					],
					counted: true,
				});
				return;
			}
			submission.settle('error', {
				failures: results
					.filter((result) => !result.success && result.shouldContinue === false)
					.map((result) =>
						submissionIssue('actionFailed', { actionId: result.actionId, message: result.error }),
					),
				counted: true,
			});
		},
		[
			config,
			onSubmit,
			onAction,
			onActionResults,
			dispatchActions,
			buildActionContext,
			hasMatching,
			getCurrentStep,
			submission,
			fetch,
		],
	);

	const submitEvent = useCallback(
		async (event?: BaseSyntheticEvent) => {
			event?.preventDefault();
			await guard.run(async () => {
				submission.begin();
				let result: FormSubmitResult;
				try {
					result = await container.submit();
				} catch (error) {
					logger.error('Form validation failed:', error);
					submission.settle('error', {
						failures: [submissionIssue('validationFailed', { message: errorMessage(error) })],
					});
					return;
				}
				if (result.outcome === 'passed') {
					await handleSubmit(result);
				} else if (result.outcome === 'invalid') {
					submission.settle('idle', { counted: true });
					fields.focusFirst(Object.keys(container.getSnapshot().errors));
				} else {
					submission.settle('idle');
				}
			});
		},
		[guard, container, submission, fields, handleSubmit],
	);

	return { submitEvent, executeAction };
}
