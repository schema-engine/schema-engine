import { logger } from '@/lib/logger';
import { useCallback, useState, type BaseSyntheticEvent } from 'react';
import type { FormStateContainer } from '@schema-engine/forms/state-container';
import type { FieldRegistry } from '@/adapters/field-registry';
import type { SubmissionStatusStore } from '@/adapters/submission-status';
import type { FormValues } from '@/adapters/types';
import type { FormActionConfig } from '@schema-engine/forms/schemas';
import {
	collectStepActions,
	createSubmissionGuard,
	runSubmissionLifecycle,
	type BuilderActionBaseContext,
	type FormActionTrigger,
	type FormConfigView,
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

export type NormalizedFormAction = Exclude<NonNullable<FormConfigView['actions']>[number], readonly unknown[]>;

interface UseFormSubmitHandlerOptions {
	container: FormStateContainer;
	status: SubmissionStatusStore;
	fields: FieldRegistry;
	config: FormConfigView;
	buildActionContext: () => BuilderActionBaseContext;
	hasMatching: (actions: readonly ActionSequenceEntry<FormActionConfig>[], trigger: FormActionTrigger) => boolean;
	submission: SubmissionStateManager;
	getCurrentStep: () => number;
	onSubmit?: (data: FormValues) => void | Promise<void>;
	onAction?: (action: NormalizedFormAction, data: FormValues) => void | Promise<void>;
	onActionResults?: (results: readonly SubmissionActionResult[], trigger: FormActionTrigger) => void | Promise<void>;
	dispatchActions: (
		input: ActionDispatchInput<FormActionConfig, BuilderActionBaseContext, FormActionTrigger>,
		suppressSubmitReport?: boolean,
	) => Promise<ActionDispatchResult[]>;
}

export type SubmissionContextValue = {
	executeAction: (action: FormActionConfig) => Promise<ActionExecutionResult>;
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
export function useFormSubmitHandler({
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
}: UseFormSubmitHandlerOptions): {
	submitEvent: (event?: BaseSyntheticEvent) => Promise<void>;
} & SubmissionContextValue {
	const [guard] = useState(createSubmissionGuard);
	const { submissionState, setSubmissionPending, setSubmissionSuccess, setSubmissionError, clearSubmission } =
		submission;

	const executeAction = useCallback(
		async (action: FormActionConfig) => {
			setSubmissionPending();
			return dispatchActions({ actions: [action], trigger: 'form_submit', context: buildActionContext() })
				.then(async (results) => {
					const result = results[0];
					if (!result) {
						setSubmissionError({ errors: [{ actionId: action.id, type: 'noResult' }] });
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
							errors: [{ actionId: action.id, type: 'actionFailed', message: result.error || undefined }],
						});
					}
					return result;
				})
				.catch((error) => {
					const errorMessage = error instanceof Error ? error.message : undefined;
					setSubmissionError({
						errors: [{ actionId: action.id, type: 'actionFailed', message: errorMessage }],
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
					context: buildActionContext,
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
							actionId: failure.phase === 'callback' ? 'submit' : 'unknown',
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
						actionId: result.actionId,
						type: 'actionFailed' as const,
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
								actionId: 'validation',
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
