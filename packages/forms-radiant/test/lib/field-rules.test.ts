import { describe, expect, test } from 'vitest';
import { toFieldRules } from '@/lib/field-rules';

describe('toFieldRules', () => {
	test('maps required and email rules for RuiField', () => {
		const rules = toFieldRules([
			{ type: 'required', message: 'Name is required' },
			{ type: 'email', message: 'Invalid email' },
		]);

		expect(rules?.required).toBe('Name is required');
		const pattern = rules?.pattern as { value: RegExp; message: string } | undefined;
		expect(pattern).toEqual({
			value: expect.any(RegExp),
			message: 'Invalid email',
		});
		expect(pattern?.value.test('jane@example.com')).toBe(true);
		expect(pattern?.value.test('not-an-email')).toBe(false);
	});

	test('returns undefined when a field has no rules', () => {
		expect(toFieldRules(undefined)).toBeUndefined();
		expect(toFieldRules([])).toBeUndefined();
	});
});
