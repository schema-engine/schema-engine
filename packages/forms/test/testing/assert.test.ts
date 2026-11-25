import { expect, test } from 'vitest';
import {
	AssertionError,
	assertEqual,
	assertMatches,
	assertThrows,
	createSpy,
	replaceProperty,
	stubGlobal,
	waitFor,
} from '@/testing/assert';

const throwing = (error: Error) => () => {
	throw error;
};

const never = () => {
	throw new Error('still failing');
};

const fails = (check: () => void) => expect(check).toThrow(AssertionError);

test('assertEqual compares deeply and treats an undefined property as a missing one', () => {
	assertEqual(
		{ a: [1, { b: new Map([['k', new Set([1])]]) }], c: undefined },
		{ a: [1, { b: new Map([['k', new Set([1])]]) }] },
	);
	assertEqual(new Date(0), new Date(0));
	assertEqual(Number.NaN, Number.NaN);
	assertEqual([undefined], [undefined]);
	fails(() => assertEqual({ a: 1 }, { a: 2 }));
	fails(() => assertEqual([1], [1, undefined]));
	fails(() => assertEqual(new Date(0), new Date(1)));
	fails(() => assertEqual(new Set([1]), new Set([2])));
	fails(() => assertEqual(new Map([['k', 1]]), new Map([['k', 2]])));
	fails(() => assertEqual([], {}));
	expect(() => assertEqual({ a: 1 }, { a: 2 }, 'the row')).toThrow('the row: expected {"a": 1} to equal {"a": 2}');
});

test('assertMatches checks only the keys it names, down to arrays', () => {
	assertMatches({ a: 1, b: { c: 2, d: 3 } }, { b: { c: 2 } });
	assertMatches(Object.assign(new Error('x'), { path: 'p' }), { path: 'p', message: 'x' });
	fails(() => assertMatches({ a: 1 }, { a: 1, b: undefined }));
	fails(() => assertMatches([1, 2], [1]));
	fails(() => assertMatches(undefined, { a: 1 }));
});

test('assertThrows matches an error class or a message pattern', () => {
	assertThrows(throwing(new TypeError('bad')), TypeError);
	assertThrows(throwing(new Error('names row 3')), /row 3/);
	fails(() => assertThrows(() => undefined));
	fails(() => assertThrows(throwing(new Error('x')), TypeError));
	fails(() => assertThrows(throwing(new Error('x')), /y/));
});

test('a spy records the arguments of each call and can change what it does', () => {
	const spy = createSpy((value: number) => value * 2);
	expect(spy(2)).toBe(4);
	spy.implement((value) => value + 1);
	expect(spy(2)).toBe(3);
	expect(spy.calls).toEqual([[2], [2]]);
});

test('waitFor retries until the check passes, and rethrows the last error on timeout', async () => {
	let tries = 0;
	await waitFor(
		() => {
			tries += 1;
			if (tries < 3) throw new Error('not yet');
		},
		{ interval: 1 },
	);
	expect(tries).toBe(3);
	await expect(waitFor(never, { timeout: 20, interval: 5 })).rejects.toThrow('still failing');
});

test('stubGlobal and replaceProperty restore what was there, or remove what was not', () => {
	const original = globalThis.fetch;
	const restore = stubGlobal('fetch', 'stub');
	expect(globalThis.fetch).toBe('stub');
	restore();
	expect(globalThis.fetch).toBe(original);

	const target: Record<string, unknown> = Object.create({ inherited: 1 });
	const undo = replaceProperty(target, 'inherited', 2);
	expect(Object.hasOwn(target, 'inherited')).toBe(true);
	undo();
	expect(Object.hasOwn(target, 'inherited')).toBe(false);
	expect(target.inherited).toBe(1);
});
