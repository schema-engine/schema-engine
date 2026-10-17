import { describe, expect, test } from 'vitest';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import { normalizedTestConfig } from '../adapters/test-config';
import {
	collectConstrainedElements,
	createAuthoredDisabledLookup,
	createConstraintLookup,
} from '@/lib/constraint-elements';

describe('collectConstrainedElements', () => {
	test('returns empty array when config is undefined or has no constrained elements', () => {
		expect(collectConstrainedElements(undefined)).toEqual([]);

		const config = normalizedTestConfig({
			id: 'test-form',
			title: 'Test',
			steps: [
				{
					id: 'step-1',
					title: 'Step 1',
					elements: [
						{
							$type: 'input',
							id: 'name',
							name: 'name',
							label: 'Name',
						},
					],
				},
			],
		});

		expect(collectConstrainedElements(config)).toEqual([]);
	});

	test('collects constrained elements from steps and nested containers', () => {
		const config = normalizedTestConfig({
			id: 'contact-form',
			title: 'Contact',
			steps: [
				{
					id: 'details',
					title: 'Details',
					elements: [
						{
							$type: 'select',
							id: 'subject',
							name: 'subject',
							label: 'Subject',
							options: [
								{ value: 'general', label: 'General' },
								{ value: 'support', label: 'Support' },
							],
						},
						{
							$type: 'input',
							id: 'ticket',
							name: 'ticket',
							label: 'Support ticket number',
							rules: [{ type: 'required', message: 'Required' }],
							constraints: [{ field: 'subject', operator: 'equals', value: 'support', action: 'show' }],
						},
						{
							$type: 'group',
							id: 'extra-group',
							name: 'extraGroup',
							elements: [
								{
									$type: 'textarea',
									id: 'details-text',
									name: 'detailsText',
									label: 'Details',
									constraints: [
										{ field: 'ticket', operator: 'is_not_empty', value: undefined, action: 'show' },
									],
								},
							],
						},
					],
				},
			],
		});

		const result = collectConstrainedElements(config);
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			fieldName: 'ticket',
			id: 'ticket',
			constraints: [{ field: 'subject', operator: 'equals', value: 'support', action: 'show' }],
			isRequired: true,
			disabled: false,
		});
		expect(result[1]).toEqual({
			fieldName: 'extraGroup.detailsText',
			id: 'details-text',
			constraints: [{ field: 'ticket', operator: 'is_not_empty', action: 'show' }],
			isRequired: false,
			disabled: false,
		});
	});
});

describe('createConstraintLookup', () => {
	const config = {
		id: 'test-form',
		title: 'Test',
		steps: [
			{
				id: 'step-1',
				title: 'Step 1',
				elements: [
					{
						$type: 'arrayElements',
						id: 'contacts',
						name: 'contacts',
						elements: [
							{
								$type: 'input',
								id: 'contact-email',
								name: 'email',
								constraints: [{ field: 'kind', operator: 'equals', value: 'work', action: 'show' }],
							},
						],
					},
					{
						$type: 'fieldset',
						id: 'address',
						name: 'address',
						elements: [
							{
								$type: 'input',
								id: 'address-vat',
								name: 'vat',
								constraints: [{ field: 'country', operator: 'equals', value: 'it', action: 'show' }],
							},
						],
					},
				],
			},
		],
	} as unknown as NormalizedFormConfig;

	test('matches every rendered row of an array back to one declaration', () => {
		const declaring = createConstraintLookup(config);

		expect(declaring('contacts.0.email')?.fieldName).toBe('contacts.email');
		expect(declaring('contacts.7.email')?.fieldName).toBe('contacts.email');
	});

	test('matches a nested object field by its exact rendered path', () => {
		expect(createConstraintLookup(config)('address.vat')?.fieldName).toBe('address.vat');
	});

	test('returns undefined for a path that declares no constraints', () => {
		expect(createConstraintLookup(config)('contacts.0.phone')).toBeUndefined();
	});

	test('has no declarations for a config without constraints', () => {
		expect(createConstraintLookup(undefined)('anything')).toBeUndefined();
	});
});

/**
 * @remarks
 * The element authors an `id` and no `name`, which is the case under test, so
 * it cannot go through `normalizedTestConfig`: authored elements require `name`.
 */
const idOnlyConfig = {
	id: 'ids',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{
					$type: 'input',
					id: 'ref',
					disabled: true,
					constraints: [{ field: 'mode', operator: 'equals', value: 'manual', action: 'enable' }],
				},
			],
		},
	],
} as unknown as NormalizedFormConfig;

test('id-only constraints retain their live lookup', () => {
	expect(createConstraintLookup(idOnlyConfig)('ref')).toMatchObject({ fieldName: 'ref', disabled: true });
});

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
