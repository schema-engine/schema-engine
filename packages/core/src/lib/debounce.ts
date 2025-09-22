/**
 * Debouncing utilities for form engine operations
 *
 * These utilities help manage timing of operations like validation,
 * API calls, and user input handling to improve performance and UX.
 */

/**
 * Global map to track debounce timeouts by key
 * This allows multiple debounced operations to coexist without conflicts
 */
const debounceTimeouts = new Map<string, NodeJS.Timeout>();

/**
 * Creates a debounced version of a function that delays execution
 * until after the specified delay has elapsed since the last invocation.
 *
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds
 * @param key - Unique key to identify this debounced operation
 * @returns Promise that resolves when the debounced function executes
 *
 * @example
 * ```typescript
 * // Debounce an async validation call
 * await debounce(
 *   () => validateField(value),
 *   500,
 *   `validation:${fieldName}:${value}`
 * );
 *
 * // Debounce a search API call
 * await debounce(
 *   () => searchAPI(query),
 *   300,
 *   `search:${query}`
 * );
 * ```
 */
export function debounce<T>(fn: () => Promise<T> | T, delay: number, key: string): Promise<T> {
	return new Promise((resolve, reject) => {
		// Clear existing timeout for this key
		const existingTimeout = debounceTimeouts.get(key);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
		}

		// Set new timeout
		const timeoutId = setTimeout(async () => {
			debounceTimeouts.delete(key);
			try {
				const result = await fn();
				resolve(result);
			} catch (error) {
				reject(error);
			}
		}, delay);

		debounceTimeouts.set(key, timeoutId);
	});
}

/**
 * Synchronous debounce utility that returns a debounced function
 * Useful for event handlers and other synchronous operations
 *
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced version of the function
 *
 * @example
 * ```typescript
 * const debouncedSearch = createDebounced(
 *   (query: string) => performSearch(query),
 *   300
 * );
 *
 * // Use in event handlers
 * input.addEventListener('input', (e) => {
 *   debouncedSearch(e.target.value);
 * });
 * ```
 */
export function createDebounced<T extends (...args: any[]) => any>(
	fn: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let timeoutId: NodeJS.Timeout | undefined;

	return (...args: Parameters<T>) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			fn(...args);
		}, delay);
	};
}

/**
 * Cancels all pending debounced operations
 * Useful for cleanup when components unmount or forms are reset
 */
export function clearAllDebounces(): void {
	for (const timeoutId of debounceTimeouts.values()) {
		clearTimeout(timeoutId);
	}
	debounceTimeouts.clear();
}

/**
 * Cancels a specific debounced operation by key
 *
 * @param key - The key used when creating the debounced operation
 */
export function clearDebounce(key: string): void {
	const timeoutId = debounceTimeouts.get(key);
	if (timeoutId) {
		clearTimeout(timeoutId);
		debounceTimeouts.delete(key);
	}
}

/**
 * Gets the number of currently pending debounced operations
 * Useful for debugging and testing
 */
export function getPendingDebounces(): number {
	return debounceTimeouts.size;
}
