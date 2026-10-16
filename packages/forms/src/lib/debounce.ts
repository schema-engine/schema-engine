export type DebounceOutcome<T> = { status: 'completed'; value: T } | { status: 'skipped' };

export interface DebounceScope {
	debounce<T>(fn: () => Promise<T> | T, delay: number, key: string): Promise<DebounceOutcome<T>>;
}

interface PendingDebounce {
	timeout: ReturnType<typeof setTimeout>;
	skip: () => void;
}

/** Creates keyed debounce state private to its owner. */
export function createDebounceScope(): DebounceScope {
	const pending = new Map<string, PendingDebounce>();

	return {
		debounce<T>(fn: () => Promise<T> | T, delay: number, key: string): Promise<DebounceOutcome<T>> {
			const existing = pending.get(key);
			if (existing) {
				clearTimeout(existing.timeout);
				existing.skip();
			}

			return new Promise((resolve, reject) => {
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
					skip: () => resolve({ status: 'skipped' }),
				});
			});
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
