import { describe, expect, test } from 'vitest';
import { createChangeDetector, expandValues, flattenValues } from '@/adapters/radiant/controller/values';

describe('Radiant form value conversion', () => {
	test('flattens null-prototype records in nested array defaults', () => {
		const item = Object.assign(Object.create(null) as Record<string, unknown>, { role: 'Alice' });
		const values = Object.assign(Object.create(null) as Record<string, unknown>, { contacts: [item] });

		expect(flattenValues(values)).toMatchObject({
			'contacts.0.role': 'Alice',
		});
	});

	test('expands null-prototype field values into independent records', () => {
		const item = Object.assign(Object.create(null) as Record<string, unknown>, { role: 'Alice' });
		const values = Object.assign(Object.create(null) as Record<string, unknown>, { 'contacts.0': item });

		expect(expandValues(values)).toEqual({ contacts: [{ role: 'Alice' }] });
	});
});

describe('createChangeDetector', () => {
	test('takes the first snapshot as the baseline', () => {
		const changed = createChangeDetector();

		expect(changed({ name: 'Ada' })).toBe(false);
	});

	test('reports a changed value, a nested change and an array change once each', () => {
		const changed = createChangeDetector();
		changed({ name: 'Ada', tags: ['a'], address: { city: 'Rome' } });

		expect(changed({ name: 'Bob', tags: ['a'], address: { city: 'Rome' } })).toBe(true);
		expect(changed({ name: 'Bob', tags: ['a'], address: { city: 'Rome' } })).toBe(false);
		expect(changed({ name: 'Bob', tags: ['a', 'b'], address: { city: 'Rome' } })).toBe(true);
		expect(changed({ name: 'Bob', tags: ['a', 'b'], address: { city: 'Oslo' } })).toBe(true);
	});

	test('does not report an equal snapshot built from new objects', () => {
		const changed = createChangeDetector();
		changed({ tags: ['a'], when: new Date(0) });

		expect(changed({ tags: ['a'], when: new Date(0) })).toBe(false);
	});

	test('reports a differing date, a reordered array, a null and a key added inside a record', () => {
		const changed = createChangeDetector();
		changed({ when: new Date(0), tags: ['a', 'b'], note: '', address: { city: 'Rome' } });

		expect(changed({ when: new Date(1), tags: ['a', 'b'], note: '', address: { city: 'Rome' } })).toBe(true);
		expect(changed({ when: new Date(1), tags: ['b', 'a'], note: '', address: { city: 'Rome' } })).toBe(true);
		expect(changed({ when: new Date(1), tags: ['b', 'a'], note: null, address: { city: 'Rome' } })).toBe(true);
		expect(changed({ when: new Date(1), tags: ['b', 'a'], note: null, address: { city: 'Rome', zip: '1' } })).toBe(
			true,
		);
	});

	test('treats an absent value and an empty string as equal, but not a cleared value', () => {
		const changed = createChangeDetector();
		changed({ name: '' });

		expect(changed({})).toBe(false);
		expect(changed({ name: '' })).toBe(false);
		expect(changed({ name: 'Ada' })).toBe(true);
		expect(changed({ name: '' })).toBe(true);
	});
});
