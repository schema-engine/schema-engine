import type { RuntimeAction } from './runtime-action';
import { logger } from '@/lib/logger';
import { useCallback, useState, type BaseSyntheticEvent } from 'react';
import type { FormStateContainer } from '@schema-engine/forms/state-container';
import type { FieldRegistry } from '@/hooks/form-state/field-registry';
import type { SubmissionStatusStore } from '@/hooks/form-state/submission-status';
import type { FormValues } from '@/hooks/form-state/types';
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
import type { SubmissionState, SubmissionError } from '@/hooks/use-submission-state';

interface SubmissionStateManager {
	submissionState: SubmissionState;
	setSubmissionPending: () => void;
	setSubmissionSuccess: () => void;
	setSubmissionError: (error: { errors: SubmissionError[] }) => void;
	clearSubmission: () => void;
}

interface UseFormSubmitHandlerOptions<TAction extends RuntimeAction> {
	container: FormStateContainer;
	status: SubmissionStatusStore;
	fields: FieldRegistry;
	config: {
		readonly actions?: readonly ActionSequenceEntry<TAction>[];
		readonly steps: readonly { readonly actions?: readonly ActionSequenceEntry<TAction>[] }[];
	};
	buildActionContext: (values?: FormValues) => BuilderActionBaseContext;
	hasMatching: (actions: readonly ActionSequenceEntry<TAction>[], trigger: FormActionTrigger) => boolean;
	submission: SubmissionStateManager;
	getCurrentStep: () => number;
	onSubmit?: (data: FormValues) => void | Promise<void>;
	onAction?: (action: TAction, data: FormValues) => void | Promise<void>;
	onActionResults?: (results: readonly SubmissionActionResult[], trigger: FormActionTrigger) => void | Promise<void>;
	dispatchActions: (
		input: ActionDispatchInput<TAction, BuilderActionBaseContext, FormActionTrigger>,
		suppressSubmitReport?: boolean,
	) => Promise<ActionDispatchResult[]>;
}

export type SubmissionContextValue<TAction extends RuntimeAction = RuntimeAction> = {
	executeAction: (action: TAction) => Promise<ActionExecutionResult>;
	submissionState: SubmissionState;
	clearSubmission: () => void;
};

/**
 * Handles form submission with full action lifecycle support.
 * Manages the complete submission flow including:
 * - the guard, which ignores a submit while one runs, and the container's submission: it begins one, validates
 *   the whole form with it and reads how that ended
 * - on `passed`: form_submit_start, form_submit, form_submit_success/error, form_submit_complete triggers,
 *   with `onSubmit` given exactly the values that passed; on `invalid`: the first error's control is focused;
 *   on `overtaken`: nothing, since an edit outran the check and the user can submit again
 * - Error handling and state management
 * - User-provided onSubmit and onAction callbacks
 *
 * @remarks
 * Callbacks receive the frozen normalized action snapshot. React reports no native validity of its own, so
 * the check runs on the container's rules and on the facts widgets reported with their values.
 */
export function useFormSubmitHandler<TAction extends RuntimeAction>({
	container,
	status,
	fields,
	config,
	buildActionContext,
	hasMatching,
	submission,
	getCurrentStep,
	onSubmit,
	onAction,
	onActionResults,
	dispatchActions,
}: UseFormSubmitHandlerOptions<TAction>): {
	submitEvent: (event?: BaseSyntheticEvent) => Promise<void>;
} & SubmissionContextValue<TAction> {
	const [guard] = useState(createSubmissionGuard);
	const { submissionState, setSubmissionPending, setSubmissionSuccess, setSubmissionError, clearSubmission } =
		submission;

	const executeAction = useCallback(
		async (action: TAction) => {
			setSubmissionPending();
			return dispatchActions({ actions: [action], trigger: 'form_submit', context: buildActionContext() })
				.then(async (results) => {
					const result = results[0];
					if (!result) {
						setSubmissionError({ errors: [{ type: 'noResult', actionId: action.id }] });
						return { success: false };
					}

					if (result.success) {
						try {
							await onAction?.(action, container.getSnapshot().values);
							setSubmissionSuccess();
						} catch (actionError) {
							logger.error('Action callback failed:', actionError);
							throw actionError;
						}
					} else {
						setSubmissionError({
							errors: [{ type: 'actionFailed', actionId: action.id, message: result.error || undefined }],
						});
					}
					return result;
				})
				.catch((error) => {
					const errorMessage = error instanceof Error ? error.message : undefined;
					setSubmissionError({
						errors: [{ type: 'actionFailed', actionId: action.id, message: errorMessage }],
					});
					return { success: false, error: errorMessage };
				});
		},
		[
			container,
			onAction,
			dispatchActions,
			buildActionContext,
			setSubmissionPending,
			setSubmissionSuccess,
			setSubmissionError,
		],
	);

	const handleSubmit = useCallback(
		async (data: FormValues) => {
			setSubmissionPending();

			const { succeeded, results, failure } = await runSubmissionLifecycle(
				(input) => dispatchActions(input, true),
				{
					actions: collectStepActions(config, getCurrentStep()),
					context: () => buildActionContext(data),
					hasMatching,
					onAction,
					onSubmit: () => onSubmit?.(data),
				},
			);

			try {
				if (results.length) await onActionResults?.(results, 'form_submit');
			} catch (error) {
				logger.error('Action results callback failed:', error);
			}

			if (succeeded) {
				if (failure) logger.error('Form submission completed with a failing trigger:', failure.error);
				setSubmissionSuccess();
				return;
			}
			if (failure) {
				logger.error('Form submission failed:', failure.error);
				setSubmissionError({
					errors: [
						{
							type: failure.phase === 'callback' ? 'callbackFailed' : 'triggerFailed',
							message: failure.error instanceof Error ? failure.error.message : undefined,
						},
					],
				});
				return;
			}
			setSubmissionError({
				errors: results
					.filter((result) => !result.success && result.shouldContinue === false)
					.map((result) => ({
						type: 'actionFailed' as const,
						actionId: result.actionId,
						message: result.error || undefined,
					})),
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
			setSubmissionPending,
			setSubmissionSuccess,
			setSubmissionError,
		],
	);

	const submitEvent = useCallback(
		async (event?: BaseSyntheticEvent) => {
			event?.preventDefault();
			await guard.run(async () => {
				status.begin();
				let ended = false;
				try {
					const token = container.beginSubmission();
					await container.validate(undefined, { submission: token });
					if (token.outcome === 'passed') {
						ended = true;
						await handleSubmit(token.values);
					} else if (token.outcome === 'invalid') {
						ended = true;
						fields.focusFirst(Object.keys(container.getSnapshot().errors));
					}
				} catch (error) {
					logger.error('Form validation failed:', error);
					setSubmissionError({
						errors: [
							{
								type: 'validationFailed',
								message: error instanceof Error ? error.message : undefined,
							},
						],
					});
				} finally {
					status.end(ended);
				}
			});
		},
		[guard, container, status, fields, handleSubmit, setSubmissionError],
	);

	return {
		submitEvent,
		executeAction,
		submissionState,
		clearSubmission,
	};
}
