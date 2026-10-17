import { logger } from '@/lib/logger';
import { useCallback } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import type { FormActionConfig } from '@schema-engine/forms/schemas';
import {
	runSubmissionLifecycle,
	type BuilderActionBaseContext,
	type FormActionTrigger,
	type FormConfigView,
} from '@schema-engine/forms';
import type { ActionDispatcher, ActionExecutionResult } from '@schema-engine/forms/actions';
import type { SubmissionState, SubmissionError } from '@/hooks/use-submission-state';

interface SubmissionStateManager {
	submissionState: SubmissionState;
	setSubmissionPending: () => void;
	setSubmissionSuccess: () => void;
	setSubmissionError: (error: { errors: SubmissionError[] }) => void;
	clearSubmission: () => void;
}

type NormalizedFormAction = NonNullable<FormConfigView['actions']>[number];

interface UseFormSubmitHandlerOptions {
	form: UseFormReturn;
	config: FormConfigView;
	actionExecutor: ActionDispatcher<BuilderActionBaseContext, FormActionTrigger>;
	buildActionContext: () => BuilderActionBaseContext;
	submission: SubmissionStateManager;
	dispatchTrigger: (trigger: FormActionTrigger) => Promise<ActionExecutionResult[]>;
	onSubmit?: (data: FieldValues) => void | Promise<void>;
	onAction?: (action: NormalizedFormAction, data: FieldValues) => void | Promise<void>;
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
	actionExecutor,
	buildActionContext,
	submission,
	dispatchTrigger,
	onSubmit,
	onAction,
}: UseFormSubmitHandlerOptions): { handleSubmit: (data: FieldValues) => Promise<void> } & SubmissionContextValue {
	const { submissionState, setSubmissionPending, setSubmissionSuccess, setSubmissionError, clearSubmission } =
		submission;

	const executeAction = useCallback(
		async (action: FormActionConfig) => {
			setSubmissionPending();
			return actionExecutor
				.dispatch({ actions: [action], trigger: 'form_submit', context: buildActionContext() })
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
			actionExecutor,
			buildActionContext,
			setSubmissionPending,
			setSubmissionSuccess,
			setSubmissionError,
		],
	);

	const handleSubmit = useCallback(
		async (data: FieldValues) => {
			setSubmissionPending();

			if (config.actions && config.actions.length > 0) {
				try {
					const { succeeded, results } = await runSubmissionLifecycle(
						(input) => actionExecutor.dispatch(input),
						{ actions: config.actions, context: buildActionContext, onAction },
					);

					const executionErrors = results.reduce<SubmissionError[]>((acc, result, index) => {
						if (!result.success && result.shouldContinue === false) {
							acc.push({
								actionId: `action-${index}`,
								message: result.error || 'Action execution failed',
							});
						}
						return acc;
					}, []);

					if (!succeeded) {
						setSubmissionError({ errors: executionErrors });
						return;
					}
				} catch (error) {
					logger.error('Form action execution failed:', error);
					setSubmissionError({
						errors: [
							{ actionId: 'unknown', message: error instanceof Error ? error.message : 'Unknown error' },
						],
					});
					await dispatchTrigger('form_submit_error');
					await dispatchTrigger('form_submit_complete');
					return;
				}
			}

			try {
				if (onSubmit) {
					await onSubmit(data);
				}
				if (config.onSubmit) {
					await config.onSubmit(data);
				}
				setSubmissionSuccess();
			} catch (error) {
				logger.error('Form submission failed:', error);
				setSubmissionError({
					errors: [{ actionId: 'submit', message: error instanceof Error ? error.message : 'Unknown error' }],
				});
			}
		},
		[
			config,
			onSubmit,
			onAction,
			actionExecutor,
			buildActionContext,
			dispatchTrigger,
			setSubmissionPending,
			setSubmissionSuccess,
			setSubmissionError,
		],
	);

	return {
		handleSubmit,
		executeAction,
		submissionState,
		clearSubmission,
	};
}
