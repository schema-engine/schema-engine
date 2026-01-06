import { useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useSubmissionState } from '@/hooks/use-submission-state';
import type { SubmissionError } from '@/hooks/use-submission-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/core-ui/alert';
import type { SubmissionAlertProps } from './form-submission-alert.types';

const DEFAULT_SUCCESS_MESSAGE = 'Form submitted successfully';
const DEFAULT_ERROR_MESSAGE = 'An error occurred during submission';
const DEFAULT_PENDING_MESSAGE = 'Submitting...';
const DEFAULT_AUTO_DISMISS_MS = 5000;

/**
 * Display element that shows submission status feedback (core-ui variant).
 *
 * Add to form via: `.addElement('submission-alert', { ... })`
 */
export function FormSubmissionAlert({
	showOn = ['error', 'success'],
	autoDismiss = DEFAULT_AUTO_DISMISS_MS,
	successMessage = DEFAULT_SUCCESS_MESSAGE,
	errorMessage = DEFAULT_ERROR_MESSAGE,
	pendingMessage = DEFAULT_PENDING_MESSAGE,
	className,
}: SubmissionAlertProps) {
	const { submissionState, clearSubmission } = useSubmissionState();
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (autoDismiss > 0 && submissionState.status === 'success') {
			timerRef.current = setTimeout(() => {
				clearSubmission();
			}, autoDismiss);
		}

		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, [submissionState.status, autoDismiss, clearSubmission]);

	if (!showOn.includes(submissionState.status)) {
		return null;
	}

	switch (submissionState.status) {
		case 'pending':
			return (
				<Alert variant="info" className={`grid-cols-[1rem_1fr] gap-x-3 ${className || ''}`}>
					<div className="size-4 mt-0.5">
						<Loader2 className="size-4 animate-spin" />
					</div>
					<AlertTitle>{pendingMessage}</AlertTitle>
				</Alert>
			);

		case 'success':
			return (
				<Alert variant="success" className={className}>
					<CheckCircle2 className="size-4" />
					<AlertTitle>{submissionState.successMessage || successMessage}</AlertTitle>
				</Alert>
			);

		case 'error':
			return (
				<Alert variant="danger" className={className}>
					<XCircle className="size-4" />
					<AlertTitle>Submission Error</AlertTitle>
					<AlertDescription>
						{submissionState.errors.length > 0 ? (
							<ul>
								{submissionState.errors.map((error: SubmissionError, index: number) => (
									<li key={`${error.actionId}-${index}`}>{error.message}</li>
								))}
							</ul>
						) : (
							<span>{errorMessage}</span>
						)}
					</AlertDescription>
				</Alert>
			);

		default:
			return null;
	}
}
