import { useMemo, useSyncExternalStore } from 'react';
import type {
	FormIssueFormatter,
	FormStateIssue,
	FormStateSnapshot,
	FormSubmissionIssue,
} from '@schema-engine/forms/state-container';
import { formatIssueText, useFormStateContext, type FormStateContextValue } from './context';
import type { FormContextValue } from './types';

type FormStateKey = keyof FormContextValue['formState'];

type Texts = Record<string, { message?: string }>;

/** The text of each error by path, made once for an errors map, since the map keeps its reference until an error changes. */
function createTexts(formatIssue: FormIssueFormatter | undefined) {
	const byErrors = new WeakMap<object, Texts>();
	return (errors: FormStateSnapshot['errors']): Texts => {
		let texts = byErrors.get(errors);
		if (!texts) {
			texts = Object.fromEntries(
				Object.entries(errors).map(([path, error]) => {
					const message = formatIssueText(error, path, formatIssue);
					return [path, message === undefined ? {} : { message }];
				}),
			);
			byErrors.set(errors, texts);
		}
		return texts;
	};
}

/**
 * Reads a form's state lazily: the keys a component reads are the keys
 * that re-render it.
 *
 * @remarks
 * Reading a key records it, and the store the component subscribes to counts a notification only when a
 * recorded key's value changed. A key read between the render and the subscription is checked when the
 * subscription starts, so no change is missed.
 */
function createTrackedFormState(
	{ container, runtime }: Pick<FormStateContextValue, 'container' | 'runtime'>,
	formatIssue: FormIssueFormatter | undefined,
) {
	const seen = new Map<FormStateKey, unknown>();
	const texts = createTexts(formatIssue);
	let version = 0;
	const read = (key: FormStateKey): unknown => {
		switch (key) {
			case 'errors':
				return container.getSnapshot().errors;
			case 'isValid':
				return container.getSnapshot().isValid;
			case 'submission':
				return runtime.getSnapshot().submission;
		}
	};
	const track = <T>(key: FormStateKey, value: T): T => {
		if (!seen.has(key)) seen.set(key, read(key));
		return value;
	};

	const formState: FormContextValue['formState'] = {
		get errors() {
			return track('errors', texts(container.getSnapshot().errors));
		},
		get isValid() {
			return track('isValid', container.getSnapshot().isValid);
		},
		get submission() {
			return track('submission', runtime.getSnapshot().submission);
		},
	};

	const notify = (listener: () => void) => {
		let changed = false;
		seen.forEach((previous, key) => {
			const current = read(key);
			if (!Object.is(current, previous)) {
				seen.set(key, current);
				changed = true;
			}
		});
		if (changed) {
			version += 1;
			listener();
		}
	};

	return {
		formState,
		subscribe: (listener: () => void) => {
			const onChange = () => notify(listener);
			const stopContainer = container.subscribe(onChange);
			const stopRuntime = runtime.subscribe(onChange);
			onChange();
			return () => {
				stopContainer();
				stopRuntime();
			};
		},
		getSnapshot: () => version,
	};
}

/**
 * The commands over the form and its state, read lazily.
 *
 * @remarks
 * `formState` re-renders a component only for the keys it reads: one that reads `submission` does not
 * render while the user types, and reading `isValid` costs nothing, since it reports the errors recorded
 * and never validates. The returned object keeps its identity while the form's formatter does.
 */
export function useFormContext(): FormContextValue {
	const { container, formatIssue, fields, runtime } = useFormStateContext();
	const tracked = useMemo(
		() => createTrackedFormState({ container, runtime }, formatIssue),
		[container, runtime, formatIssue],
	);
	useSyncExternalStore(tracked.subscribe, tracked.getSnapshot, tracked.getSnapshot);

	return useMemo(
		() => ({
			getValues: () => container.getSnapshot().values,
			setValue: (name, value) => container.setValue(name, value),
			validate: (name) => container.validate(typeof name === 'string' ? [name] : name),
			reset: (values) => container.reset(values),
			setFocus: (name) => fields.focus(name),
			formatIssue: (issue: FormStateIssue | FormSubmissionIssue, { path }) =>
				formatIssueText(issue, path, formatIssue),
			clearSubmission: () => runtime.clearSubmission(),
			formState: tracked.formState,
		}),
		[container, fields, runtime, formatIssue, tracked],
	);
}
