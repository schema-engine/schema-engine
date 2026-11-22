import { useCallback } from 'react';
import { isFieldRequired, type ElementConfig } from '@schema-engine/forms/schemas';
import { selectError, selectValue, selectWarning, type NativeOptions } from '@schema-engine/forms/state-container';
import { formatIssueText, useContainerSelector, useFormStateContext } from './context';
import type { FormFieldValue } from './types';

/**
 * Binds a widget to the field at `config.name`.
 *
 * @remarks
 * The value is the container's, so the widget re-renders when this field's value, error or flags change
 * and not for another field. A controlled widget calls `onChange(value)`; one that wraps a native input
 * with constraints adds what the control reports, `onChange(value, { native })`.
 *
 * The value is `unknown`, as the container holds it: the widget knows its own control's type and narrows it.
 */
export function useFormField(config: ElementConfig): FormFieldValue {
	const { container, formatIssue, fields } = useFormStateContext();
	const path = config.name;
	const value = useContainerSelector((snapshot) => selectValue(snapshot, path));
	const error = useContainerSelector((snapshot) => selectError(snapshot, path));
	const warning = useContainerSelector((snapshot) => selectWarning(snapshot, path));

	const onChange = useCallback(
		(next: unknown, options?: NativeOptions) => container.setValue(path, next, options),
		[container, path],
	);
	const onBlur = useCallback(() => container.blur(path), [container, path]);
	const ref = useCallback(
		(element: HTMLElement | null) => (element ? fields.register(path, element) : undefined),
		[fields, path],
	);

	return {
		value,
		error: error && formatIssueText(error, path, formatIssue),
		warning: warning && formatIssueText(warning, path, formatIssue),
		invalid: error !== undefined,
		onChange,
		onBlur,
		name: path,
		required: isFieldRequired(config.rules),
		disabled: Boolean(config.disabled),
		ref,
	};
}
