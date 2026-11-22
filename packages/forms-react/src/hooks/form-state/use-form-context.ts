import { useMemo, useSyncExternalStore } from 'react';
import type {
	FormIssueFormatter,
	FormStateIssue,
	FormStateSnapshot,
	FormSubmissionIssue,
} from '@schema-engine/forms/state-container';
import { formatIssueText, useFormStateContext, type FormStateContextValue } from './context';
import type { SubmissionState } from './submission-store';
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

/** The status and failures of a submission state, as the same object while neither changed, so `submitCount` does not re-render a reader of them. */
function createSubmissionView() {
	let view: FormContextValue['formState']['submission'] | undefined;
	return (state: SubmissionState): FormContextValue['formState']['submission'] => {
		if (!view || view.status !== state.status || view.failures !== state.failures) {
			view = { status: state.status, failures: state.failures };
		}
		return view;
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
	{ container, submission }: Pick<FormStateContextValue, 'container' | 'submission'>,
	formatIssue: FormIssueFormatter | undefined,
) {
	const seen = new Map<FormStateKey, unknown>();
	const texts = createTexts(formatIssue);
	const submissionView = createSubmissionView();
	let version = 0;
	const read = (key: FormStateKey): unknown => {
		switch (key) {
			case 'errors':
				return container.getSnapshot().errors;
			case 'isValid':
				return container.getSnapshot().isValid;
			case 'isSubmitting':
				return submission.getSnapshot().status === 'pending';
			case 'submitCount':
				return submission.getSnapshot().submitCount;
			case 'submission':
				return submissionView(submission.getSnapshot());
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
		get isSubmitting() {
			return track('isSubmitting', submission.getSnapshot().status === 'pending');
		},
		get submitCount() {
			return track('submitCount', submission.getSnapshot().submitCount);
		},
		get submission() {
			return track('submission', submissionView(submission.getSnapshot()));
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
			const stopSubmission = submission.subscribe(onChange);
			onChange();
			return () => {
				stopContainer();
				stopSubmission();
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
 * and never validates. The returned object keeps its identity while the form's formatter does.
 */
export function useFormContext(): FormContextValue {
	const { container, formatIssue, fields, submission } = useFormStateContext();
	const tracked = useMemo(
		() => createTrackedFormState({ container, submission }, formatIssue),
		[container, submission, formatIssue],
	);
	useSyncExternalStore(tracked.subscribe, tracked.getSnapshot, tracked.getSnapshot);

	return useMemo(
		() => ({
			getValues: () => container.getSnapshot().values,
			setValue: (name, value) => container.setValue(name, value),
			validate: (name) => container.validate(typeof name === 'string' ? [name] : name),
			reset: (values) => {
				container.reset(values);
				submission.resetCount();
			},
			setFocus: (name) => fields.focus(name),
			formatIssue: (issue: FormStateIssue | FormSubmissionIssue, { path }) =>
				formatIssueText(issue, path, formatIssue),
			clearSubmission: () => submission.clear(),
			formState: tracked.formState,
		}),
		[container, fields, submission, formatIssue, tracked],
	);
}
