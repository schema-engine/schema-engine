import { useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { FormConfig, FormActionConfig } from '@schema-engine/forms/schemas';
import type { FormActionTrigger } from '@schema-engine/forms';
import type { ActionExecutionResult } from '@schema-engine/actions';
import type { SubmissionState, SubmissionError } from '@/hooks/use-submission-state';

interface SubmissionStateManager {
	submissionState: SubmissionState;
	setSubmissionPending: () => void;
	setSubmissionSuccess: () => void;
	setSubmissionError: (error: { errors: SubmissionError[] }) => void;
	clearSubmission: () => void;
}

interface UseFormSubmitHandlerOptions {
	form: UseFormReturn<any>;
	config: FormConfig;
	submission: SubmissionStateManager;
	dispatchTrigger: (trigger: FormActionTrigger) => Promise<ActionExecutionResult[]>;
	onSubmit?: (data: any) => void | Promise<void>;
	onAction?: (action: FormActionConfig, data: any) => void | Promise<void>;
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
 */
export function useFormSubmitHandler({
	form,
	config,
	submission,
	dispatchTrigger,
	onSubmit,
	onAction,
}: UseFormSubmitHandlerOptions): { handleSubmit: (data: any) => Promise<void> } & SubmissionContextValue {
	const { submissionState, setSubmissionPending, setSubmissionSuccess, setSubmissionError, clearSubmission } =
		submission;

	const executeAction = useCallback(
		async (action: FormActionConfig) => {
			setSubmissionPending();
			return dispatchTrigger('form_submit')
				.then(async (results) => {
					const result = results[0] || { success: false, error: 'No result returned' };

					if (result.success) {
						try {
							await onAction?.(action, form.getValues());
							setSubmissionSuccess();
						} catch (actionError) {
							console.error('Action callback failed:', actionError);
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
		[form, onAction, dispatchTrigger, setSubmissionPending, setSubmissionSuccess, setSubmissionError],
	);

	const handleSubmit = useCallback(
		async (data: any) => {
			await form.trigger();
			setSubmissionPending();

			if (config.actions && config.actions.length > 0) {
				try {
					await dispatchTrigger('form_submit_start');

					const results = await dispatchTrigger('form_submit');

					const executionErrors = results.reduce<SubmissionError[]>((acc, result, index) => {
						if (!result.success && result.shouldContinue === false) {
							acc.push({
								actionId: config.actions?.[index]?.id ?? `action-${index}`,
								message: result.error || 'Action execution failed',
							});
						}
						return acc;
					}, []);

					if (executionErrors.length > 0) {
						setSubmissionError({ errors: executionErrors });
						await dispatchTrigger('form_submit_error');
						await dispatchTrigger('form_submit_complete');
						return;
					}

					await dispatchTrigger('form_submit_success');
					await dispatchTrigger('form_submit_complete');
				} catch (error) {
					console.error('Form action execution failed:', error);
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
				console.error('Form submission failed:', error);
				setSubmissionError({
					errors: [{ actionId: 'submit', message: error instanceof Error ? error.message : 'Unknown error' }],
				});
			}
		},
		[config, onSubmit, form, dispatchTrigger, setSubmissionPending, setSubmissionSuccess, setSubmissionError],
	);

	return {
		handleSubmit,
		executeAction,
		submissionState,
		clearSubmission,
	};
}
