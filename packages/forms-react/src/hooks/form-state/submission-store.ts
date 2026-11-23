import type { FormSubmissionIssue } from '@schema-engine/forms/state-container';

/** Where a submission is: `idle` until one starts, `pending` while it runs, then how it ended. */
export type SubmissionStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * What the form reports about its submissions.
 *
 * @remarks `failures` explain an `error` status and are empty otherwise. They are issues, so the form's one formatter words them.
 */
export interface SubmissionState {
	readonly status: SubmissionStatus;
	readonly failures: readonly FormSubmissionIssue[];
	/** The submissions that ended, whether they passed or failed validation. */
	readonly submitCount: number;
}

/** A subscribable {@link SubmissionState} that the provider writes and `useFormContext` reads lazily. */
export interface SubmissionStore {
	subscribe(listener: () => void): () => void;
	getSnapshot(): SubmissionState;
	/** A submission started: it is pending and the failures of the last one are gone. */
	begin(): void;
	/**
	 * The submission ended with `status`.
	 *
	 * @remarks `counted` when it passed or failed validation, not when it was overtaken or was an action alone.
	 */
	settle(
		status: Exclude<SubmissionStatus, 'pending'>,
		options?: { readonly failures?: readonly FormSubmissionIssue[]; readonly counted?: boolean },
	): void;
	/** Back to `idle` with no failures; the count stays. */
	clear(): void;
	/** The form was reset: a fresh form, with no submission started or ended. */
	reset(): void;
}

const NO_FAILURES: readonly FormSubmissionIssue[] = Object.freeze([]);

/**
 * The submission state the form container does not own.
 *
 * @remarks Each write publishes a new snapshot, so it is safe in `useSyncExternalStore`.
 */
export function createSubmissionStore(): SubmissionStore {
	const listeners = new Set<() => void>();
	let snapshot: SubmissionState = { status: 'idle', failures: NO_FAILURES, submitCount: 0 };
	const publish = (next: SubmissionState) => {
		snapshot = next;
		listeners.forEach((listener) => listener());
	};
	return {
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		getSnapshot: () => snapshot,
		begin: () => publish({ ...snapshot, status: 'pending', failures: NO_FAILURES }),
		settle: (status, { failures = NO_FAILURES, counted = false } = {}) =>
			publish({ status, failures, submitCount: counted ? snapshot.submitCount + 1 : snapshot.submitCount }),
		clear: () => publish({ ...snapshot, status: 'idle', failures: NO_FAILURES }),
		reset: () => publish({ status: 'idle', failures: NO_FAILURES, submitCount: 0 }),
	};
}
