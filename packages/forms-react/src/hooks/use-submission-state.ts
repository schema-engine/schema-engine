import { useState, useCallback, useContext } from 'react';
import { FormInstanceContext } from '@/components/provider';

/**
 * Submission error from a failed action
 */
export interface SubmissionError {
	actionId: string;
	message: string;
}

/**
 * Submission state machine
 */
export type SubmissionStatus = 'idle' | 'pending' | 'success' | 'error';

export interface SubmissionState {
	status: SubmissionStatus;
	/** Errors from failed actions */
	errors: SubmissionError[];
	/** Success message (uses default if not provided) */
	successMessage: string | null;
}

const DEFAULT_SUCCESS_MESSAGE = 'Form submitted successfully';

const initialState: SubmissionState = {
	status: 'idle',
	errors: [],
	successMessage: null,
};

export interface SubmissionStateActions {
	setSubmissionPending: () => void;
	setSubmissionSuccess: (params?: { message?: string }) => void;
	setSubmissionError: (params: { errors: SubmissionError[] }) => void;
	clearSubmission: () => void;
}

export interface UseSubmissionStateReturn extends SubmissionStateActions {
	submissionState: SubmissionState;
}

/**
 * Hook for managing submission state internally in FormProvider
 *
 * @internal Use useSubmissionState() for consuming components
 */
export function useSubmissionStateManager(): UseSubmissionStateReturn {
	const [submissionState, setSubmissionState] = useState<SubmissionState>(initialState);

	const setSubmissionPending = useCallback(() => {
		setSubmissionState({
			status: 'pending',
			errors: [],
			successMessage: null,
		});
	}, []);

	const setSubmissionSuccess = useCallback((params?: { message?: string }) => {
		setSubmissionState({
			status: 'success',
			errors: [],
			successMessage: params?.message ?? DEFAULT_SUCCESS_MESSAGE,
		});
	}, []);

	const setSubmissionError = useCallback((params: { errors: SubmissionError[] }) => {
		setSubmissionState({
			status: 'error',
			errors: params.errors,
			successMessage: null,
		});
	}, []);

	const clearSubmission = useCallback(() => {
		setSubmissionState(initialState);
	}, []);

	return {
		submissionState,
		setSubmissionPending,
		setSubmissionSuccess,
		setSubmissionError,
		clearSubmission,
	};
}

/**
 * Hook for submission-aware components
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { submissionState, clearSubmission } = useSubmissionState();
 *
 *   if (submissionState.status === 'error') {
 *     return <Alert onClose={clearSubmission}>{submissionState.errors[0]?.message}</Alert>;
 *   }
 * }
 * ```
 */
export function useSubmissionState() {
	const context = useContext(FormInstanceContext);

	if (!context) {
		throw new Error('useSubmissionState must be used within a FormProvider');
	}

	return {
		submissionState: context.submissionState,
		clearSubmission: context.clearSubmission,
	};
}
