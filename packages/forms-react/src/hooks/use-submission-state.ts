import { useState, useCallback, useContext } from 'react';
import { FormInstanceContext } from '@/components/provider';

/**
 * Why a submission failed, as a typed failure the application words.
 *
 * @remarks
 * Only a failure of an action names it (`actionId`). `message` is only the text the failure itself carried (an
 * action's error, an exception's message) and is absent when it carried none.
 */
export type SubmissionError =
	| { readonly type: 'actionFailed'; readonly actionId: string; readonly message?: string }
	| { readonly type: 'noResult'; readonly actionId: string }
	| { readonly type: 'callbackFailed'; readonly message?: string }
	| { readonly type: 'triggerFailed'; readonly message?: string }
	| { readonly type: 'validationFailed'; readonly message?: string };

export type SubmissionErrorType = SubmissionError['type'];

/**
 * Submission state machine
 */
export type SubmissionStatus = 'idle' | 'pending' | 'success' | 'error';

export interface SubmissionState {
	status: SubmissionStatus;
	/** Why the submission failed */
	errors: SubmissionError[];
	/** Success message the submission supplied, if any */
	successMessage: string | null;
}

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
			successMessage: params?.message ?? null,
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
