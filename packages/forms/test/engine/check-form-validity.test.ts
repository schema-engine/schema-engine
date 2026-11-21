import { describe, expect, test } from 'vitest';
import { checkFormValidity, createFormEngine } from '@/index';

const registry = createFormEngine().getValidationRegistry();
const steps = [
	{
		elements: [
			{ name: 'email', $type: 'input', inputType: 'email', rules: [{ type: 'required', message: 'Required' }] },
			{ name: 'nickname', $type: 'input', inputType: 'text' },
		],
	},
	{ elements: [{ name: 'phone', $type: 'input', inputType: 'text', rules: [{ type: 'required' }] }] },
];

describe('checkFormValidity', () => {
	test('is false while a required field of any step is empty', async () => {
		expect(await checkFormValidity({ steps, values: { email: 'a@b.co' }, registry })).toBe(false);
	});

	test('is true when every field passes', async () => {
		expect(await checkFormValidity({ steps, values: { email: 'a@b.co', phone: '1' }, registry })).toBe(true);
	});

	test('skips a field a show constraint hides and the fields inside a hidden container', async () => {
		const show = [{ field: 'kind', operator: 'equals' as const, value: 'business', action: 'show' as const }];
		const hidden = [
			{
				elements: [
					{ name: 'kind', $type: 'input', inputType: 'text' },
					{
						name: 'company',
						$type: 'input',
						inputType: 'text',
						rules: [{ type: 'required' }],
						constraints: show,
					},
					{
						name: 'billing',
						$type: 'fieldSet',
						constraints: show,
						elements: [{ name: 'vat', $type: 'input', inputType: 'text', rules: [{ type: 'required' }] }],
					},
				],
			},
		];

		expect(await checkFormValidity({ steps: hidden, values: { kind: 'person' }, registry })).toBe(true);
		expect(await checkFormValidity({ steps: hidden, values: { kind: 'business' }, registry })).toBe(false);
	});
});
