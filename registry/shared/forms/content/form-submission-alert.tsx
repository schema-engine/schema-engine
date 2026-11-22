import { useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useFieldHost, useSubmissionState, type SubmissionError } from '@schema-engine/forms-react/hooks';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { SubmissionAlertProps } from './form-submission-alert.types';

const DEFAULT_SUCCESS_MESSAGE = 'Form submitted successfully';
const DEFAULT_ERROR_MESSAGE = 'An error occurred during submission';
const DEFAULT_PENDING_MESSAGE = 'Submitting...';
const DEFAULT_AUTO_DISMISS_MS = 5000;

/**
 * Display element that shows submission status feedback (shadcn Base UI variant).
 *
 * Add to a form step: `{ $type: 'submission-alert', id: 'status', name: 'status' }`
 */
export function FormSubmissionAlert({
	showOn = ['error', 'success'],
	autoDismiss = DEFAULT_AUTO_DISMISS_MS,
	successMessage = DEFAULT_SUCCESS_MESSAGE,
	errorMessage = DEFAULT_ERROR_MESSAGE,
	pendingMessage = DEFAULT_PENDING_MESSAGE,
	grid,
	style,
}: SubmissionAlertProps) {
	const { submissionState, clearSubmission } = useSubmissionState();
	const host = useFieldHost(grid, style);
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout>;

		if (autoDismiss > 0 && submissionState.status === 'success') {
			timer = setTimeout(() => {
				clearSubmission();
			}, autoDismiss);
		}

		return () => {
			if (timer) {
				clearTimeout(timer);
			}
		};
	}, [submissionState.status, autoDismiss, clearSubmission]);

	if (!showOn.includes(submissionState.status)) {
		return null;
	}

	switch (submissionState.status) {
		case 'pending':
			return (
				<Alert {...host} variant="default" className={`${host.className} grid-cols-[1rem_1fr] gap-x-3`}>
					<div className="size-4 mt-0.5">
						<Loader2 className="size-4 animate-spin" />
					</div>
					<AlertTitle>{pendingMessage}</AlertTitle>
				</Alert>
			);

		case 'success':
			return (
				<Alert
					{...host}
					variant="default"
					className={`${host.className} border-emerald-500/50 text-emerald-700`}
				>
					<CheckCircle2 className="size-4" />
					<AlertTitle>{submissionState.successMessage || successMessage}</AlertTitle>
				</Alert>
			);

		case 'error':
			return (
				<Alert {...host} variant="destructive">
					<XCircle className="size-4" />
					<AlertTitle>Submission Error</AlertTitle>
					<AlertDescription>
						{submissionState.errors.length > 0 ? (
							<ul>
								{submissionState.errors.map((error: SubmissionError, index: number) => (
									<li key={`${error.type}-${index}`}>
										{('message' in error ? error.message : undefined) || errorMessage}
									</li>
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
