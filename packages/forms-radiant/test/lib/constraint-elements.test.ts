import { describe, expect, test } from 'vitest';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import { collectConstrainedElements } from '@/lib/constraint-elements';

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
