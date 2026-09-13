import { describe, expect, beforeEach, afterEach, test } from 'vitest';
import { FormStore } from '@/adapters/store/form-store';
import { setActiveFormStore } from '@/adapters/store/active-store';
import { useFieldArray } from '@/adapters/radiant/hooks/use-field-array';
import type { FormConfig } from '@schema-engine/forms/schemas';

const sampleConfig: FormConfig = {
	id: 'field-array-form',
	steps: [
		{
			id: 'step-1',
			elements: [
				{
					$type: 'input',
					id: 'users',
					name: 'users',
					label: 'Users',
				},
			],
		},
	],
};

describe('useFieldArray', () => {
	let store: FormStore;

	beforeEach(() => {
		store = new FormStore(sampleConfig);
		setActiveFormStore(store);
	});

	afterEach(() => {
		setActiveFormStore(null);
	});

	test('returns empty fields list when no array value is present in store', () => {
		const { fields } = useFieldArray('users');
		expect(fields).toEqual([]);
	});

	test('appends single and multiple values', () => {
		const arrayHelper = useFieldArray('users');
		arrayHelper.append({ name: 'Alice' });
		expect(store.getValue('users')).toEqual([{ name: 'Alice' }]);

		arrayHelper.append([{ name: 'Bob' }, { name: 'Charlie' }]);
		expect(store.getValue('users')).toEqual([{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }]);

		expect(new Set(useFieldArray('users').fields.map(({ id }) => id)).size).toBe(3);
	});

	test('preserves row identity across insertion, reordering, and removal with duplicate values', () => {
		store.setValue('users', ['same', 'same']);
		const helper = useFieldArray('users');
		const [first, second] = helper.fields;
		helper.prepend('new');
		const prepended = helper.fields[0];
		helper.insert(2, 'inserted');
		const inserted = helper.fields[2];
		expect(helper.fields).toEqual([prepended, first, inserted, second]);
		useFieldArray('users').swap(0, 3);
		expect(helper.fields).toEqual([second, first, inserted, prepended]);
		helper.move(3, 1);
		expect(helper.fields).toEqual([second, prepended, first, inserted]);
		helper.remove([1, 3]);
		expect(helper.fields).toEqual([second, first]);
		expect(store.getValue('users')).toEqual(['same', 'same']);
	});

	test('refreshes identity on update, replacement, and external writes', () => {
		store.setValue('users', ['a', 'b']);
		const helper = useFieldArray('users');
		const original = helper.fields;
		helper.update(0, 'updated');
		expect(helper.fields[0]).not.toEqual(original[0]);
		expect(helper.fields[1]).toEqual(original[1]);
		helper.replace(['x']);
		const replaced = helper.fields;
		expect(original).not.toContainEqual(replaced[0]);
		store.setValue('users', ['external']);
		expect(helper.fields).not.toEqual(replaced);
		helper.append('next');
		expect(store.getValue('users')).toEqual(['external', 'next']);
		store.setValue('users', undefined);
		expect(helper.fields).toEqual([]);
	});

	test('uses current values after dotted-path edits without resetting row identity', () => {
		store.setValue('users', ['a', 'b']);
		const helper = useFieldArray('users');
		const original = helper.fields;
		store.setValue('users.0', 'edited');
		helper.move(0, 1);
		expect(store.getValue('users')).toEqual(['b', 'edited']);
		expect(helper.fields).toEqual([original[1], original[0]]);
	});

	test('isolates row identity between stores and fields', () => {
		store.setValue('users', ['a']);
		store.setValue('other', ['a']);
		const first = useFieldArray('users').fields;
		expect(useFieldArray('other').fields).not.toEqual(first);
		setActiveFormStore(new FormStore(sampleConfig, { users: ['a'] }));
		expect(useFieldArray('users').fields).not.toEqual(first);
	});

	test('prepends single and multiple values', () => {
		store.setValue('users', [{ name: 'Charlie' }]);
		const arrayHelper = useFieldArray('users');

		arrayHelper.prepend({ name: 'Bob' });
		expect(store.getValue('users')).toEqual([{ name: 'Bob' }, { name: 'Charlie' }]);

		arrayHelper.prepend([{ name: 'Zara' }, { name: 'Alice' }]);
		expect(store.getValue('users')).toEqual([
			{ name: 'Zara' },
			{ name: 'Alice' },
			{ name: 'Bob' },
			{ name: 'Charlie' },
		]);
	});

	test('inserts values at specified index', () => {
		store.setValue('users', ['a', 'c']);
		const arrayHelper = useFieldArray('users');

		arrayHelper.insert(1, 'b');
		expect(store.getValue('users')).toEqual(['a', 'b', 'c']);

		arrayHelper.insert(1, ['x', 'y']);
		expect(store.getValue('users')).toEqual(['a', 'x', 'y', 'b', 'c']);
	});

	test('swaps elements within bounds and ignores out of bounds indices', () => {
		store.setValue('users', ['first', 'second', 'third']);
		const arrayHelper = useFieldArray('users');

		arrayHelper.swap(0, 2);
		expect(store.getValue('users')).toEqual(['third', 'second', 'first']);

		arrayHelper.swap(-1, 2);
		expect(store.getValue('users')).toEqual(['third', 'second', 'first']);

		arrayHelper.swap(0, 99);
		expect(store.getValue('users')).toEqual(['third', 'second', 'first']);
	});

	test('moves elements within bounds and ignores out of bounds indices', () => {
		store.setValue('users', ['a', 'b', 'c', 'd']);
		const arrayHelper = useFieldArray('users');

		arrayHelper.move(1, 3);
		expect(store.getValue('users')).toEqual(['a', 'c', 'd', 'b']);

		arrayHelper.move(-1, 2);
		expect(store.getValue('users')).toEqual(['a', 'c', 'd', 'b']);

		arrayHelper.move(10, 2);
		expect(store.getValue('users')).toEqual(['a', 'c', 'd', 'b']);
	});

	test('updates element at index', () => {
		store.setValue('users', ['a', 'b', 'c']);
		const arrayHelper = useFieldArray('users');

		arrayHelper.update(1, 'updated-b');
		expect(store.getValue('users')).toEqual(['a', 'updated-b', 'c']);
	});

	test('replaces entire array', () => {
		store.setValue('users', ['a', 'b']);
		const arrayHelper = useFieldArray('users');

		arrayHelper.replace(['x', 'y', 'z']);
		expect(store.getValue('users')).toEqual(['x', 'y', 'z']);
	});

	test('removes element by single index, array of indices, or clears all when undefined', () => {
		store.setValue('users', ['a', 'b', 'c', 'd', 'e']);
		const arrayHelper = useFieldArray('users');

		arrayHelper.remove(1);
		expect(store.getValue('users')).toEqual(['a', 'c', 'd', 'e']);

		arrayHelper.remove([0, 2]);
		expect(store.getValue('users')).toEqual(['c', 'e']);

		arrayHelper.remove();
		expect(store.getValue('users')).toEqual([]);
	});
});
