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

	test('uses the shared phone validator for complete numbers', () => {
		const rules = toFieldRules([{ type: 'phone' }]);
		expect(typeof rules?.validate).toBe('function');

		const validate = rules?.validate as (value: unknown) => boolean | string;
		expect(validate('+44')).toBe('Enter a complete phone number');
		expect(validate('+442079460958')).toBe(true);
	});
});
