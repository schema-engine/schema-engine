import { useCallback } from 'react';
import {
	selectError,
	selectFieldState,
	type FormFieldState,
	type FormStateError,
	type FormStateIssue,
} from '@schema-engine/forms/state-container';
import { formatIssueText, useContainerSelector, useFormStateContext } from './context';

/**
 * The error of exactly `path`: a field, a container such as an array, or `FORM_ROOT` for the form itself.
 *
 * @remarks
 * It is the engine's error with its `type`, `ruleId`, `params` and every issue in `all`, for a host that
 * writes the text itself. For the text the provider's formatter makes, use {@link useFormatIssue}.
 */
export function useFormError(path: string): FormStateError | undefined {
	return useContainerSelector((snapshot) => selectError(snapshot, path));
}

/** The state of one field: its error and warning, and whether it is touched, dirty or being validated. */
export function useFieldState(path: string): FormFieldState {
	return useContainerSelector((snapshot) => selectFieldState(snapshot, path));
}

/**
 * The function that turns an issue into text, as the provider's `formatIssue` says.
 *
 * @remarks
 * It answers with the issue's own `message` when there is no formatter or it says nothing, and with
 * `undefined` when there is neither. The rule type is never shown. The function keeps its identity while
 * the formatter does.
 */
export function useFormatIssue(): (issue: FormStateIssue, path: string) => string | undefined {
	const { formatIssue } = useFormStateContext();
	return useCallback((issue, path) => formatIssueText(issue, path, formatIssue), [formatIssue]);
}
