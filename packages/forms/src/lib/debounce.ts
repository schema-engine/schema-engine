export type DebounceOutcome<T> = { status: 'completed'; value: T } | { status: 'skipped' };

export interface DebounceScope {
	/**
	 * Runs `fn` after `delay` unless a later call with the same `key` replaces it.
	 *
	 * @remarks
	 * A replaced call whose `input` equals the replacing call's settles with that
	 * call's outcome, since the same work is still running. Any other replaced call
	 * resolves `skipped` at once.
	 */
	debounce<T>(fn: () => Promise<T> | T, delay: number, key: string, input: string): Promise<DebounceOutcome<T>>;
}

/**
 * @remarks
 * `settle` takes `unknown` results because one map holds calls of every result
 * type; a key is reused only by calls of the same type, so the replaced call
 * narrows the outcome back to its own.
 */
interface PendingDebounce {
	timeout: ReturnType<typeof setTimeout>;
	input: string;
	settle: (outcome: DebounceOutcome<unknown> | Promise<DebounceOutcome<unknown>>) => void;
}

/** Creates keyed debounce state private to its owner. */
export function createDebounceScope(): DebounceScope {
	const pending = new Map<string, PendingDebounce>();

	return {
		debounce<T>(fn: () => Promise<T> | T, delay: number, key: string, input: string): Promise<DebounceOutcome<T>> {
			const existing = pending.get(key);
			const outcome = new Promise<DebounceOutcome<T>>((resolve, reject) => {
				const timeout = setTimeout(async () => {
					pending.delete(key);
					try {
						resolve({ status: 'completed', value: await fn() });
					} catch (error) {
						reject(error);
					}
				}, delay);

				pending.set(key, {
					timeout,
					input,
					settle: (next) => resolve(next as DebounceOutcome<T> | Promise<DebounceOutcome<T>>),
				});
			});

			if (existing) {
				clearTimeout(existing.timeout);
				existing.settle(existing.input === input ? outcome : { status: 'skipped' });
			}

			return outcome;
		},
	};
}

/** Creates a debounced callback whose timer is private to that callback. */
export function createDebounced<TArgs extends unknown[]>(fn: (...args: TArgs) => unknown, delay: number) {
	let timeout: ReturnType<typeof setTimeout> | undefined;

	return (...args: TArgs): void => {
		if (timeout) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(() => {
			fn(...args);
		}, delay);
	};
}
