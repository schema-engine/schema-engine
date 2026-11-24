import type { FormIssueFormatter, FormStateIssue, FormSubmissionIssue } from './types';

/**
 * The text to show for an issue at `path`: what the form's formatter says, else the issue's own `message`, else nothing.
 *
 * @remarks
 * A formatter that returns an empty text says nothing worth showing. The rule type is never the text: it names the
 * problem for a program, not for a person, so a binding that has neither a formatter nor a message shows nothing.
 */
export function issueText(
	issue: FormStateIssue | FormSubmissionIssue,
	path: string,
	formatIssue: FormIssueFormatter | undefined,
): string | undefined {
	return formatIssue?.(issue, { path }) || issue.message || undefined;
}
