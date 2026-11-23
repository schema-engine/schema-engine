import { describe, expect, test } from 'vitest';
import { omitPaths } from '@/lib/omit-paths';

describe('omitPaths', () => {
	test('removes the key a path ends at, and leaves the input as it was', () => {
		const input = { a: 1, b: { c: 2, d: 3 } };

		expect(omitPaths(input, [['b', 'c']])).toEqual({ a: 1, b: { d: 3 } });
		expect(input).toEqual({ a: 1, b: { c: 2, d: 3 } });
	});

	test('removes a whole key, a list included, and leaves the other keys', () => {
		expect(omitPaths({ ranks: [1, 'x', 3], other: [1] }, [['ranks']])).toEqual({ other: [1] });
	});

	test('leaves a list alone when a path goes inside it, since a list is one field', () => {
		expect(omitPaths({ ranks: [1, 'x', 3] }, [['ranks', 1]])).toEqual({ ranks: [1, 'x', 3] });
	});

	test('reuses a value that is not a plain object, and ignores a path that names nothing', () => {
		const date = new Date(0);

		expect(omitPaths({ when: date, a: 1 }, [['missing', 'deep'], ['a']])).toEqual({ when: date });
		expect(omitPaths({ when: date }, [])['when']).toBe(date);
	});

	test('an empty path removes everything', () => {
		expect(omitPaths({ a: 1 }, [[]])).toEqual({});
	});
});
