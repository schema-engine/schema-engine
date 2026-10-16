import { normalizeContainerFixture } from './container-fixture';
import { describe, expect, test } from 'vitest';
import { collectFieldDefaults } from '@/lib/field-scope';
import {
	expandContainerParentPaths,
	expandFieldTemplatePaths,
	getValueAtPath,
	mergePathValues,
	setValueAtPath,
} from '@/lib/path-values';

describe('path-values', () => {
	test('expands array templates against live values', () => {
		expect(expandFieldTemplatePaths({ contacts: [{ name: 'Ada' }, { name: 'Grace' }] }, 'contacts.name')).toEqual([
			'contacts.0.name',
			'contacts.1.name',
		]);
	});

	test('keeps missing child paths for each live array row', () => {
		expect(
			expandFieldTemplatePaths({ contacts: [{ email: 'ada@example.com' }, { name: 'Grace' }] }, 'contacts.email'),
		).toEqual(['contacts.0.email', 'contacts.1.email']);
	});

	test('keeps own undefined child paths for each live array row', () => {
		expect(expandFieldTemplatePaths({ contacts: [{ email: undefined }] }, 'contacts.email')).toEqual([
			'contacts.0.email',
		]);
	});

	test('does not expand child fields when a live array has no rows', () => {
		expect(expandFieldTemplatePaths({ contacts: [] }, 'contacts.email')).toEqual([]);
	});

	test('preserves an array field path when the field has no rows', () => {
		expect(expandFieldTemplatePaths({ languages: [] }, 'languages')).toEqual(['languages']);
		expect(expandFieldTemplatePaths({ languages: ['en', 'es'] }, 'languages')).toEqual(['languages']);
	});

	test('expands a terminal parent array for nested container fields', () => {
		expect(expandContainerParentPaths({ contacts: [{}, {}] }, 'contacts')).toEqual(['contacts.0', 'contacts.1']);
		expect(expandContainerParentPaths({ contacts: [] }, 'contacts')).toEqual([]);
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

		expect(mergePathValues(collectFieldDefaults([contacts, tags].map(normalizeContainerFixture)))).toEqual({
			contacts: [{ name: 'Ada' }],
			tags: ['work'],
		});
	});

	test('rejects prototype-polluting path keys on write', () => {
		expect(() => setValueAtPath({}, '__proto__.polluted', true)).toThrow(/__proto__/);
		expect(() => setValueAtPath({}, 'constructor', true)).toThrow(/constructor/);
		expect(getValueAtPath({ __proto__: { polluted: true } }, '__proto__.polluted')).toBeUndefined();
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

		expect(
			mergePathValues(
				collectFieldDefaults([contacts].map(normalizeContainerFixture), userDefaults),
				userDefaults,
			),
		).toEqual({
			contacts: [
				{ name: 'Ada', email: 'ada@example.com' },
				{ name: 'Grace', email: 'grace@example.com' },
			],
		});
	});
});

test('deep merges preserve non-plain values by reference', () => {
	class Model {
		constructor(readonly value: string) {}
	}
	const model = new Model('replacement');
	expect(mergePathValues([{ name: 'profile', defaultValue: { previous: true } }], { profile: model }).profile).toBe(
		model,
	);
});
