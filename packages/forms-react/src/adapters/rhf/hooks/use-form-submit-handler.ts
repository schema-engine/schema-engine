import { logger } from '@/lib/logger';
import { useCallback, useState, type BaseSyntheticEvent } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
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
	form: UseFormReturn;
	config: FormConfigView;
	buildActionContext: () => BuilderActionBaseContext;
	hasMatching: (actions: readonly ActionSequenceEntry<FormActionConfig>[], trigger: FormActionTrigger) => boolean;
	submission: SubmissionStateManager;
	getCurrentStep: () => number;
	onSubmit?: (data: FieldValues) => void | Promise<void>;
	onAction?: (action: NormalizedFormAction, data: FieldValues) => void | Promise<void>;
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
 * - form_submit_start, form_submit, form_submit_success/error, form_submit_complete triggers
 * - Error handling and state management
 * - User-provided onSubmit and onAction callbacks
 *
 * @remarks Callbacks receive the frozen normalized action snapshot.
 */
export function useFormSubmitHandler({
	form,
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
					const result = results[0] || { success: false, error: 'No result returned' };

					if (result.success) {
						try {
							await onAction?.(action, form.getValues());
							setSubmissionSuccess();
						} catch (actionError) {
							logger.error('Action callback failed:', actionError);
							throw actionError;
						}
					} else {
						setSubmissionError({
							errors: [{ actionId: action.id, message: result.error || 'Unknown action error' }],
						});
					}
					return result;
				})
				.catch((error) => {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					setSubmissionError({ errors: [{ actionId: action.id, message: errorMessage }] });
					return { success: false, error: errorMessage };
				});
		},
		[
			form,
			onAction,
			dispatchActions,
			buildActionContext,
			setSubmissionPending,
			setSubmissionSuccess,
			setSubmissionError,
		],
	);

	const handleSubmit = useCallback(
		async (data: FieldValues) => {
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
				setSubmissionSuccess();
				return;
			}
			if (failure) {
				logger.error('Form submission failed:', failure.error);
				setSubmissionError({
					errors: [
						{
							actionId: failure.phase === 'onSubmit' ? 'submit' : 'unknown',
							message: failure.error instanceof Error ? failure.error.message : 'Unknown error',
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
						message: result.error || 'Action execution failed',
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
			await guard.run(() => form.handleSubmit(handleSubmit)(event));
		},
		[guard, form, handleSubmit],
	);

	return {
		submitEvent,
		executeAction,
		submissionState,
		clearSubmission,
	};
}
