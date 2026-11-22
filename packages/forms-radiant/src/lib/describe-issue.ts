import type { FormIssueFormatter, FormStateIssue, FormSubmissionIssue } from '@schema-engine/forms/state-container';

/**
 * The text to show for an issue at `path`: the application's formatter, else the issue's own `message`.
 *
 * @remarks
 * Never the rule type: an issue with neither a formatter nor a message of its own shows nothing, because
 * `type` names the problem for a program and is not text for a person.
 */
export function describeIssue(
	issue: FormStateIssue | FormSubmissionIssue,
	path: string,
	format?: FormIssueFormatter,
): string | undefined {
	return format?.(issue, { path }) || issue.message || undefined;
}
