import { useMemo, useSyncExternalStore } from 'react';
import type { FormIssueFormatter, FormStateSnapshot } from '@schema-engine/forms/state-container';
import { formatIssueText, useFormStateContext, type FormStateContextValue } from './context';
import type { SubmissionStatus } from './submission-status';
import type { FormContextValue } from './types';

type FormStateKey = keyof FormContextValue['formState'];

type Texts = Record<string, { message?: string }>;

/** What each key of `formState` is made of: a branch of the container's snapshot or of the submission status. */
const sources: Record<FormStateKey, (snapshot: FormStateSnapshot, status: SubmissionStatus) => unknown> = {
	errors: (snapshot) => snapshot.errors,
	isValid: (snapshot) => snapshot.isValid,
	touchedFields: (snapshot) => snapshot.touched,
	defaultValues: (snapshot) => snapshot.defaults,
	isSubmitting: (_snapshot, status) => status.isSubmitting,
	submitCount: (_snapshot, status) => status.submitCount,
};

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
	{ container, status }: Pick<FormStateContextValue, 'container' | 'status'>,
	formatIssue: FormIssueFormatter | undefined,
) {
	const seen = new Map<FormStateKey, unknown>();
	const texts = createTexts(formatIssue);
	let version = 0;
	const read = (key: FormStateKey): unknown => sources[key](container.getSnapshot(), status.getSnapshot());
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
		get isSubmitting() {
			return track('isSubmitting', status.getSnapshot().isSubmitting);
		},
		get touchedFields() {
			return track('touchedFields', container.getSnapshot().touched);
		},
		get submitCount() {
			return track('submitCount', status.getSnapshot().submitCount);
		},
		get defaultValues() {
			return track('defaultValues', container.getSnapshot().defaults);
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
			const stopStatus = status.subscribe(onChange);
			onChange();
			return () => {
				stopContainer();
				stopStatus();
			};
		},
		getSnapshot: () => version,
	};
}

/**
 * The commands over the form and its state, read lazily.
 *
 * @remarks
 * `formState` re-renders a component only for the keys it reads: one that reads `isSubmitting` does not
 * render while the user types, and reading `isValid` costs nothing, since it reports the errors recorded
 * and never validates. The returned object keeps its identity while the provider's `formatIssue` does.
 */
export function useFormContext(): FormContextValue {
	const { container, formatIssue, fields, status } = useFormStateContext();
	const tracked = useMemo(
		() => createTrackedFormState({ container, status }, formatIssue),
		[container, status, formatIssue],
	);
	useSyncExternalStore(tracked.subscribe, tracked.getSnapshot, tracked.getSnapshot);

	return useMemo(
		() => ({
			getValues: () => container.getSnapshot().values,
			setValue: (name, value, options) => container.setValue(name, value, options),
			trigger: (name) => container.validate(typeof name === 'string' ? [name] : name),
			setFocus: (name) => fields.focus(name),
			formState: tracked.formState,
		}),
		[container, fields, tracked],
	);
}
