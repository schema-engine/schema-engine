import { describe, expect, test } from 'vitest';
import { choiceKeys } from '@/lib/choice-value';

describe('choiceKeys', () => {
	test('is the text of a string, number or boolean value, and of each such item of a list', () => {
		expect(choiceKeys('a')).toEqual(['a']);
		expect(choiceKeys(2)).toEqual(['2']);
		expect(choiceKeys(false)).toEqual(['false']);
		expect(choiceKeys(['a', 2, true])).toEqual(['a', '2', 'true']);
	});

	test('holds no key for an empty value', () => {
		expect(choiceKeys(undefined)).toEqual([]);
		expect(choiceKeys(null)).toEqual([]);
		expect(choiceKeys('')).toEqual([]);
		expect(choiceKeys([])).toEqual([]);
	});

	test('never turns an object into text', () => {
		expect(choiceKeys({ id: 1 })).toEqual([]);
		expect(choiceKeys(['a', { id: 1 }, null, ['b']])).toEqual(['a']);
	});
});
