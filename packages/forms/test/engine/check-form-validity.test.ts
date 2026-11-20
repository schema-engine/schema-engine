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

	test('answers for the values it was given', async () => {
		const values: Record<string, unknown> = { email: 'a@b.co', phone: '1' };
		const pending = checkFormValidity({ steps, values: { ...values }, registry });
		values.email = '';

		expect(await pending).toBe(true);
	});
});
