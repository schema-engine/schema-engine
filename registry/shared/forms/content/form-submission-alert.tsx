import { useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { FORM_ROOT, useFieldHost, useFormContext } from '@schema-engine/forms-react/hooks';
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
	const { formState, formatIssue, clearSubmission } = useFormContext();
	const { status, failures } = formState.submission;
	const host = useFieldHost(grid, style);
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout>;

		if (autoDismiss > 0 && status === 'success') {
			timer = setTimeout(() => {
				clearSubmission();
			}, autoDismiss);
		}

		return () => {
			if (timer) {
				clearTimeout(timer);
			}
		};
	}, [status, autoDismiss, clearSubmission]);

	if (!showOn.includes(status)) {
		return null;
	}

	switch (status) {
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
					<AlertTitle>{successMessage}</AlertTitle>
				</Alert>
			);

		case 'error':
			return (
				<Alert {...host} variant="destructive">
					<XCircle className="size-4" />
					<AlertTitle>Submission Error</AlertTitle>
					<AlertDescription>
						{failures.length > 0 ? (
							<ul>
								{failures.map((failure, index) => (
									<li key={`${failure.type}-${index}`}>
										{formatIssue(failure, { path: FORM_ROOT }) || errorMessage}
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
