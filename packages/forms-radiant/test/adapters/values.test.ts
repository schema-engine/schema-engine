import { describe, expect, test } from 'vitest';
import { expandValues, flattenValues } from '@/adapters/radiant/controller/values';

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
