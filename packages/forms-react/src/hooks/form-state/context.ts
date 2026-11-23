import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import type {
	FormIssueFormatter,
	FormStateContainer,
	FormStateIssue,
	FormStateSnapshot,
	FormSubmissionIssue,
} from '@schema-engine/forms/state-container';
import type { FormRuntime } from '@schema-engine/forms';
import type { FieldRegistry } from './field-registry';

/**
 * What a form instance provides to the hooks under it.
 *
 * @remarks The container is the only form state. The rest is what React adds around it: the issue text, the controls to focus and the runtime that owns the submission and the steps.
 */
export interface FormStateContextValue {
	readonly container: FormStateContainer;
	readonly formatIssue: FormIssueFormatter | undefined;
	readonly fields: FieldRegistry;
	/** The lifecycle around the container: submission, steps and every action; its `container` is the one above. */
	readonly runtime: FormRuntime;
}

export const FormStateContext = createContext<FormStateContextValue | null>(null);

export function useFormStateContext(): FormStateContextValue {
	const context = useContext(FormStateContext);
	if (!context) {
		throw new Error('Form hooks must be used within a FormProvider or a FormRenderer');
	}
	return context;
}

/**
 * Reads a pure selector of the container's snapshot and re-renders when its result changes.
 *
 * @remarks
 * The selectors of `@schema-engine/forms/state-container` return the same object while what they read is
 * unchanged, so `useSyncExternalStore` compares results by reference. A selector that builds a new result on
 * each call must be memoized by the caller. The first render, on the server and while hydrating, reads the
 * container's server snapshot, so both render the same.
 */
export function useContainerSelector<T>(selector: (snapshot: FormStateSnapshot) => T): T {
	const { container } = useFormStateContext();
	const subscribe = useCallback((listener: () => void) => container.subscribe(listener), [container]);
	return useSyncExternalStore(
		subscribe,
		() => selector(container.getSnapshot()),
		() => selector(container.getServerSnapshot()),
	);
}

/**
 * The text of an issue: what the form's formatter says, else the issue's own `message`, else nothing.
 *
 * @remarks A formatter that returns an empty text says nothing worth showing. The rule type is never shown.
 */
export function formatIssueText(
	issue: FormStateIssue | FormSubmissionIssue,
	path: string,
	formatIssue: FormIssueFormatter | undefined,
): string | undefined {
	const formatted = formatIssue?.(issue, { path });
	return formatted || issue.message || undefined;
}
