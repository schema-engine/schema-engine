import { useCallback } from 'react';
import {
	selectError,
	selectFieldState,
	type FormFieldState,
	type FormStateIssue,
} from '@schema-engine/forms/state-container';
import { formatIssueText, useContainerSelector, useFormStateContext } from './context';

/**
 * The text of the error of exactly `path`: a field, a container such as an array, or `FORM_ROOT` for the form itself.
 *
 * @remarks
 * The text is the provider's `formatIssue` of the error to show, else its own `message`, else `undefined`, so
 * `undefined` can mean no error or an error with no words. The engine's error, with its `type`, `ruleId`, `params` and
 * every issue in `all`, is `useFieldState(path).error`.
 */
export function useFormError(path: string): string | undefined {
	const { formatIssue } = useFormStateContext();
	const error = useContainerSelector((snapshot) => selectError(snapshot, path));
	return error && formatIssueText(error, path, formatIssue);
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
export function useFormatIssue(): (issue: FormStateIssue, field: { readonly path: string }) => string | undefined {
	const { formatIssue } = useFormStateContext();
	return useCallback((issue, { path }) => formatIssueText(issue, path, formatIssue), [formatIssue]);
}
