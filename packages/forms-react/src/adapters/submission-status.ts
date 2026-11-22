/** What the form reports about its submissions. */
export interface SubmissionStatus {
	readonly isSubmitting: boolean;
	/** The submissions that ended, whether they passed or failed validation. */
	readonly submitCount: number;
}

/** A subscribable {@link SubmissionStatus} that the provider writes and `useFormContext` reads lazily. */
export interface SubmissionStatusStore {
	subscribe(listener: () => void): () => void;
	getSnapshot(): SubmissionStatus;
	/** A submission started. */
	begin(): void;
	/** A submission ended; `counted` when it passed or failed validation, not when it was overtaken. */
	end(counted: boolean): void;
	/** The form was reset: no submission has ended since. */
	clear(): void;
}

/**
 * The submission state the form container does not own.
 *
 * @remarks
 * The provider's own submit lifecycle writes it. Each write publishes a new snapshot, so it is safe in
 * `useSyncExternalStore`.
 */
export function createSubmissionStatusStore(): SubmissionStatusStore {
	const listeners = new Set<() => void>();
	let snapshot: SubmissionStatus = { isSubmitting: false, submitCount: 0 };
	const publish = (next: SubmissionStatus) => {
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
		begin: () => publish({ ...snapshot, isSubmitting: true }),
		end: (counted) =>
			publish({ isSubmitting: false, submitCount: counted ? snapshot.submitCount + 1 : snapshot.submitCount }),
		clear: () => publish({ ...snapshot, submitCount: 0 }),
	};
}
