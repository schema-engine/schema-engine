import { describe, expect, test } from 'vitest';
import { expandFieldTemplatePaths, mergePathValues } from '@/lib/path-values';

describe('path-values', () => {
	test('expands array templates against live values', () => {
		expect(expandFieldTemplatePaths({ contacts: [{ name: 'Ada' }, { name: 'Grace' }] }, 'contacts.name')).toEqual([
			'contacts.0.name',
			'contacts.1.name',
		]);
	});

	test('keeps the template when the value tree has no match yet', () => {
		expect(expandFieldTemplatePaths({}, 'email')).toEqual(['email']);
	});

	test('merges nested field defaults under composed paths', () => {
		expect(
			mergePathValues(
				[
					{ name: 'address.street', defaultValue: '1 Main' },
					{ name: 'name', defaultValue: 'Ada' },
				],
				{ name: 'Grace' },
			),
		).toEqual({
			name: 'Grace',
			address: { street: '1 Main' },
		});
	});
});
