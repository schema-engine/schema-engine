import { describe, expect, test } from 'vitest';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import { collectConstrainedElements, createConstraintLookup } from '@/lib/constraint-elements';

describe('collectConstrainedElements', () => {
	test('returns empty array when config is undefined or has no constrained elements', () => {
		expect(collectConstrainedElements(undefined)).toEqual([]);

		const config: NormalizedFormConfig = {
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
		};

		expect(collectConstrainedElements(config)).toEqual([]);
	});

	test('collects constrained elements from steps and nested containers', () => {
		const config: NormalizedFormConfig = {
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
									constraints: [{ field: 'ticket', operator: 'not_empty', action: 'show' }],
								},
							],
						},
					],
				},
			],
		};

		const result = collectConstrainedElements(config);
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			fieldName: 'ticket',
			id: 'ticket',
			constraints: [{ field: 'subject', operator: 'equals', value: 'support', action: 'show' }],
			isRequired: true,
		});
		expect(result[1]).toEqual({
			fieldName: 'extraGroup.detailsText',
			id: 'details-text',
			constraints: [{ field: 'ticket', operator: 'not_empty', action: 'show' }],
			isRequired: false,
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
