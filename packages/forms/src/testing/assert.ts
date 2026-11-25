/**
 * The assertions, spy and timing helpers the conformance suite runs on.
 *
 * @remarks
 * Internal to the suite and not exported from the entry. They use no test runner, `node:assert` or any other
 * Node-only module, so a case runs the same under Vitest, Jest, Bun, `node:test` or in a browser: a failed check
 * throws an {@link AssertionError} and the runner reports it as a failed test.
 */

/** The error a failed check throws; its message shows what was received and what was expected. */
export class AssertionError extends Error {
	override readonly name = 'AssertionError';
}

const tagOf = (value: unknown): string => Object.prototype.toString.call(value);

/** Writes a value for a failure message, with the types JSON cannot show (`undefined`, `NaN`, `Map`, `Set`, `Date`). */
function show(value: unknown, seen: readonly unknown[] = []): string {
	if (typeof value === 'string') return JSON.stringify(value);
	if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
	if (typeof value === 'bigint') return `${value}n`;
	if (typeof value === 'symbol') return value.toString();
	if (typeof value !== 'object' || value === null) return String(value);
	if (seen.includes(value)) return '[Circular]';
	const next = [...seen, value];
	if (value instanceof Date) return `Date(${Number.isNaN(value.getTime()) ? 'Invalid' : value.toISOString()})`;
	if (value instanceof RegExp) return String(value);
	if (value instanceof Error) return `${value.name}: ${value.message}`;
	if (value instanceof Map) {
		const entries = [...value].map(([key, item]) => `${show(key, next)} => ${show(item, next)}`);
		return `Map {${entries.join(', ')}}`;
	}
	if (value instanceof Set) return `Set {${[...value].map((item) => show(item, next)).join(', ')}}`;
	if (Array.isArray(value)) return `[${value.map((item) => show(item, next)).join(', ')}]`;
	const entries = Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${show(item, next)}`);
	return `{${entries.join(', ')}}`;
}

const defined = (value: object): string[] =>
	Object.keys(value).filter((key) => (value as Record<string, unknown>)[key] !== undefined);

/**
 * Whether two values are deeply equal.
 *
 * @remarks
 * A property set to `undefined` equals a missing one, and the prototype is not compared, so `{ a: 1, b: undefined }`
 * equals `{ a: 1 }`. Covers plain objects, arrays, `Map`, `Set`, `Date`, `RegExp`, `Error`, `NaN` and cycles.
 */
function equals(actual: unknown, expected: unknown, seen: readonly [unknown, unknown][] = []): boolean {
	if (Object.is(actual, expected)) return true;
	if (typeof actual !== 'object' || typeof expected !== 'object' || actual === null || expected === null)
		return false;
	if (tagOf(actual) !== tagOf(expected)) return false;
	if (seen.some(([left, right]) => left === actual && right === expected)) return true;
	const next: [unknown, unknown][] = [...seen, [actual, expected]];
	if (actual instanceof Date && expected instanceof Date) return Object.is(actual.getTime(), expected.getTime());
	if (actual instanceof RegExp && expected instanceof RegExp) return String(actual) === String(expected);
	if (actual instanceof Error && expected instanceof Error) {
		return actual.name === expected.name && actual.message === expected.message;
	}
	if (actual instanceof Map && expected instanceof Map) {
		if (actual.size !== expected.size) return false;
		return [...actual].every(([key, item]) =>
			expected.has(key)
				? equals(item, expected.get(key), next)
				: [...expected].some(([otherKey, other]) => equals(key, otherKey, next) && equals(item, other, next)),
		);
	}
	if (actual instanceof Set && expected instanceof Set) {
		if (actual.size !== expected.size) return false;
		return [...actual].every(
			(item) => expected.has(item) || [...expected].some((other) => equals(item, other, next)),
		);
	}
	if (Array.isArray(actual) && Array.isArray(expected)) {
		return actual.length === expected.length && actual.every((item, index) => equals(item, expected[index], next));
	}
	const actualKeys = defined(actual);
	const expectedKeys = defined(expected);
	return (
		actualKeys.length === expectedKeys.length &&
		expectedKeys.every(
			(key) =>
				Object.hasOwn(actual, key) &&
				equals((actual as Record<string, unknown>)[key], (expected as Record<string, unknown>)[key], next),
		)
	);
}

/**
 * Whether `actual` holds everything `partial` names: objects by the keys of `partial`, arrays by length and item,
 * anything else by deep equality.
 */
function contains(actual: unknown, partial: unknown, seen: readonly [unknown, unknown][] = []): boolean {
	if (typeof partial !== 'object' || partial === null) return equals(actual, partial);
	if (typeof actual !== 'object' || actual === null) return false;
	if (seen.some(([left, right]) => left === actual && right === partial)) return true;
	const next: [unknown, unknown][] = [...seen, [actual, partial]];
	if (Array.isArray(partial)) {
		return (
			Array.isArray(actual) &&
			actual.length === partial.length &&
			partial.every((item, index) => contains(actual[index], item, next))
		);
	}
	if (partial instanceof Map || partial instanceof Set || partial instanceof Date || partial instanceof RegExp) {
		return equals(actual, partial);
	}
	return Object.keys(partial).every(
		(key) =>
			key in actual &&
			contains((actual as Record<string, unknown>)[key], (partial as Record<string, unknown>)[key], next),
	);
}

const prefix = (label: string | undefined): string => (label === undefined ? '' : `${label}: `);

/** Fails unless the values are deeply equal; a property set to `undefined` equals a missing one. */
export function assertEqual(actual: unknown, expected: unknown, label?: string): void {
	if (equals(actual, expected)) return;
	throw new AssertionError(`${prefix(label)}expected ${show(actual)} to equal ${show(expected)}`);
}

/** Fails unless the values are the same, by `Object.is`. */
export function assertSame(actual: unknown, expected: unknown, label?: string): void {
	if (Object.is(actual, expected)) return;
	throw new AssertionError(`${prefix(label)}expected ${show(actual)} to be ${show(expected)}`);
}

/** Fails when the values are the same, by `Object.is`. */
export function assertNotSame(actual: unknown, unexpected: unknown, label?: string): void {
	if (!Object.is(actual, unexpected)) return;
	throw new AssertionError(`${prefix(label)}expected a value other than ${show(unexpected)}`);
}

/** Fails unless `actual` has every key and value `partial` names, however many more it has. */
export function assertMatches(actual: unknown, partial: unknown, label?: string): void {
	if (contains(actual, partial)) return;
	throw new AssertionError(`${prefix(label)}expected ${show(actual)} to match ${show(partial)}`);
}

/** Fails unless the value is `undefined`. */
export function assertUndefined(actual: unknown, label?: string): void {
	if (actual === undefined) return;
	throw new AssertionError(`${prefix(label)}expected ${show(actual)} to be undefined`);
}

/** Fails when the value is `undefined`. */
export function assertDefined(actual: unknown, label?: string): void {
	if (actual !== undefined) return;
	throw new AssertionError(`${prefix(label)}expected a defined value`);
}

/** Fails unless the array has `length` items. */
export function assertLength(actual: ArrayLike<unknown>, length: number, label?: string): void {
	if (actual.length === length) return;
	throw new AssertionError(`${prefix(label)}expected length ${length}, received ${actual.length}: ${show(actual)}`);
}

/** Fails when the text matches `pattern`. */
export function assertNotMatches(actual: string, pattern: RegExp, label?: string): void {
	if (!pattern.test(actual)) return;
	throw new AssertionError(`${prefix(label)}expected ${show(actual)} not to match ${pattern}`);
}

/** Fails when the object has the property, own or inherited. */
export function assertNoProperty(actual: object, key: string, label?: string): void {
	if (!(key in actual)) return;
	throw new AssertionError(`${prefix(label)}expected ${show(actual)} not to have property ${show(key)}`);
}

/** Fails when the array holds the item, by `Object.is`. */
export function assertNotIncludes(actual: readonly unknown[], item: unknown, label?: string): void {
	if (!actual.some((candidate) => Object.is(candidate, item))) return;
	throw new AssertionError(`${prefix(label)}expected ${show(actual)} not to include ${show(item)}`);
}

/**
 * Fails unless `run` throws.
 *
 * @remarks
 * `expected` narrows what it throws: an error class, or a pattern its message must match.
 */
export function assertThrows(run: () => unknown, expected?: RegExp | (new (...args: never[]) => Error)): void {
	let thrown: unknown;
	let threw = false;
	try {
		run();
	} catch (error) {
		threw = true;
		thrown = error;
	}
	if (!threw) throw new AssertionError('expected the call to throw');
	if (expected === undefined) return;
	if (expected instanceof RegExp) {
		const message = thrown instanceof Error ? thrown.message : String(thrown);
		if (!expected.test(message)) {
			throw new AssertionError(`expected the error message ${show(message)} to match ${expected}`);
		}
		return;
	}
	if (!(thrown instanceof expected)) {
		throw new AssertionError(`expected ${show(thrown)} to be an instance of ${expected.name}`);
	}
}

/** Fails when `run` throws, and shows what it threw. */
export function assertDoesNotThrow(run: () => unknown): void {
	try {
		run();
	} catch (error) {
		throw new AssertionError(`expected the call not to throw, but it threw ${show(error)}`, { cause: error });
	}
}

/** A function that records each call it receives; see {@link createSpy}. */
export interface Spy<Args extends unknown[] = unknown[], Result = unknown> {
	(...args: Args): Result;
	/** The arguments of every call, oldest first. */
	readonly calls: Args[];
	/** Swaps what the spy does from now on; calls already recorded stay. */
	implement(implementation: (...args: Args) => Result): void;
}

/**
 * A function that records its calls and runs `implementation`, if given.
 *
 * @remarks
 * Without an implementation the spy returns `undefined`, so give one whenever the caller reads the result.
 */
export function createSpy<Args extends unknown[] = unknown[], Result = unknown>(
	implementation?: (...args: Args) => Result,
): Spy<Args, Result> {
	let current = implementation;
	const calls: Args[] = [];
	const spy = (...args: Args): Result => {
		calls.push(args);
		return current?.(...args) as Result;
	};
	return Object.assign(spy, {
		calls,
		implement(next: (...args: Args) => Result): void {
			current = next;
		},
	});
}

/** Fails unless the spy was called exactly `times` times. */
export function assertCallCount(spy: { readonly calls: readonly unknown[] }, times: number, label?: string): void {
	if (spy.calls.length === times) return;
	throw new AssertionError(`${prefix(label)}expected ${times} calls, received ${spy.calls.length}`);
}

/**
 * Puts `value` on `target` under `key` and returns what undoes it.
 *
 * @remarks
 * A property that was inherited or missing before is removed again instead of being left behind as an own one.
 */
export function replaceProperty(target: object, key: PropertyKey, value: unknown): () => void {
	const original = Object.getOwnPropertyDescriptor(target, key);
	Object.defineProperty(target, key, {
		value,
		writable: true,
		configurable: true,
		enumerable: original?.enumerable ?? true,
	});
	return () => {
		if (original === undefined) Reflect.deleteProperty(target, key);
		else Object.defineProperty(target, key, original);
	};
}

/**
 * Replaces a global, such as `fetch`, and returns what restores it.
 *
 * @remarks
 * Call the restore function in a `finally`, so a failing case cannot leak the stub into the next test.
 */
export function stubGlobal(name: string, value: unknown): () => void {
	return replaceProperty(globalThis, name, value);
}

/** Replaces `target[key]` with a {@link Spy} that calls `implementation`, and returns the spy with what restores the original. */
export function spyOn<Args extends unknown[], Result>(
	target: object,
	key: PropertyKey,
	implementation?: (...args: Args) => Result,
): { readonly spy: Spy<Args, Result>; readonly restore: () => void } {
	const spy = createSpy(implementation);
	return { spy, restore: replaceProperty(target, key, spy) };
}

/** How long {@link waitFor} keeps trying, and how long it waits between tries. */
export interface WaitForOptions {
	readonly timeout?: number;
	readonly interval?: number;
}

/**
 * Calls `check` until it stops throwing and resolves with what it returned.
 *
 * @remarks
 * Defaults to the 1000 ms timeout and 50 ms interval of Vitest's `vi.waitFor`. Rethrows the last error `check`
 * threw once the timeout passes, so the failure names the assertion that never held.
 */
export async function waitFor<Result>(
	check: () => Result | Promise<Result>,
	{ timeout = 1000, interval = 50 }: WaitForOptions = {},
): Promise<Result> {
	const deadline = Date.now() + timeout;
	for (;;) {
		try {
			return await check();
		} catch (error) {
			if (Date.now() >= deadline) throw error;
		}
		await new Promise<void>((resolve) => setTimeout(resolve, interval));
	}
}
