import { describe, expect, test } from 'vitest';
import { collectFieldDefaults } from '@/lib/field-scope';
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

	test('clones frozen parent defaults before nested writes', () => {
		const parentDefault = Object.freeze({ street: 'parent', city: 'Oslo' });

		const result = mergePathValues([
			{ name: 'address', defaultValue: parentDefault },
			{ name: 'address.street', defaultValue: 'child' },
		]);

		expect(result).toEqual({ address: { street: 'child', city: 'Oslo' } });
		expect(parentDefault).toEqual({ street: 'parent', city: 'Oslo' });
		expect(() => {
			(result.address as Record<string, unknown>).street = 'mutated';
		}).not.toThrow();
	});

	test('materializes object and scalar array child defaults', () => {
		const contacts = {
			$type: 'arrayElements',
			name: 'contacts',
			elements: [
				{ $type: 'input', name: 'name', defaultValue: 'Ada' },
				{ $type: 'input', name: 'email' },
			],
		};
		const tags = {
			$type: 'arrayElements',
			name: 'tags',
			elements: [{ $type: 'input', name: 'tag', defaultValue: 'work' }],
		};

		expect(mergePathValues(collectFieldDefaults([contacts, tags]))).toEqual({
			contacts: [{ name: 'Ada' }],
			tags: ['work'],
		});
	});

	test('applies child defaults to every provider array item and keeps explicit values', () => {
		const contacts = {
			$type: 'arrayElements',
			name: 'contacts',
			elements: [
				{ $type: 'input', name: 'name', defaultValue: 'Ada' },
				{ $type: 'input', name: 'email' },
			],
		};
		const userDefaults = {
			contacts: [{ email: 'ada@example.com' }, { name: 'Grace', email: 'grace@example.com' }],
		};

		expect(mergePathValues(collectFieldDefaults([contacts], userDefaults), userDefaults)).toEqual({
			contacts: [
				{ name: 'Ada', email: 'ada@example.com' },
				{ name: 'Grace', email: 'grace@example.com' },
			],
		});
	});
});
