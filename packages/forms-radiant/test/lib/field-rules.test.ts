import { describe, expect, test } from 'vitest';
import { registerValidation } from '@schema-engine/forms/schemas/validation';
import { toFieldRules } from '@/lib/field-rules';
import { createRadiantPhoneValidationRegistration } from '@/lib/phone-validation';

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

	test('uses the phone validator for complete numbers', async () => {
		registerValidation(createRadiantPhoneValidationRegistration());
		const rules = toFieldRules([{ type: 'phone' }]);
		expect(typeof rules?.validate).toBe('function');

		const validate = rules?.validate as (value: unknown) => Promise<boolean | string>;
		expect(await validate('+44')).toBe('Enter a complete phone number');
		expect(await validate('+442079460958')).toBe(true);
	});

	test('injects phone validation for phone-input when the author omitted the rule', async () => {
		registerValidation(createRadiantPhoneValidationRegistration());
		const rules = toFieldRules(undefined, 'phone-input');
		expect(typeof rules?.validate).toBe('function');

		const validate = rules?.validate as (value: unknown) => Promise<boolean | string>;
		expect(await validate('+44')).toBe('Enter a complete phone number');
		expect(await validate('+442079460958')).toBe(true);
	});
});
