import { describe, expect, test } from 'vitest';
import { normalizedTestConfig } from '../adapters/test-config';
import { createAuthoredDisabledLookup } from '@/lib/authored-disabled';

describe('createAuthoredDisabledLookup', () => {
	const config = normalizedTestConfig({
		id: 'authored',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'fieldSet',
						id: 'group',
						name: 'group',
						disabled: true,
						elements: [{ $type: 'input', id: 'child', name: 'child' }],
					},
					{
						$type: 'fieldSet',
						id: 'groupX',
						name: 'groupX',
						elements: [{ $type: 'input', id: 'child', name: 'child' }],
					},
					{
						$type: 'arrayElements',
						id: 'items',
						name: 'items',
						elements: [
							{ $type: 'input', id: 'name', name: 'name', disabled: true },
							{ $type: 'input', id: 'note', name: 'note' },
						],
					},
				],
			},
		],
	});
	const authoredDisabled = createAuthoredDisabledLookup(config);

	test('a disabled container disables its children but not a sibling sharing its prefix', () => {
		expect(authoredDisabled('group.child')).toBe(true);
		expect(authoredDisabled('groupX.child')).toBe(false);
	});

	test('an array row resolves its template field', () => {
		expect(authoredDisabled('items.0.name')).toBe(true);
		expect(authoredDisabled('items.1.note')).toBe(false);
	});
});
