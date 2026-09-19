import { describe, expect, test } from 'vitest';
import { createValidationContext } from '@/schemas/validation';

const values = {
	accountType: 'personal',
	billing: { country: 'it' },
	contacts: [
		{ accountType: 'personal', email: '' },
		{ accountType: 'business', email: '' },
	],
};

describe('createValidationContext', () => {
	test('resolves a bare reference to a sibling in the declaring array row', () => {
		expect(createValidationContext({ values, fieldPath: 'contacts.1.email' }).resolve('accountType')).toBe(
			'business',
		);
	});

	test('resolves a bare reference to a sibling in the declaring object', () => {
		expect(createValidationContext({ values, fieldPath: 'billing.vat' }).resolve('country')).toBe('it');
	});

	test('resolves a dotted reference from the form root', () => {
		expect(createValidationContext({ values, fieldPath: 'contacts.1.email' }).resolve('billing.country')).toBe(
			'it',
		);
	});

	test('resolves a top-level field for a top-level declaring field', () => {
		expect(createValidationContext({ values, fieldPath: 'email' }).resolve('accountType')).toBe('personal');
	});

	test('reads an absent reference as undefined rather than throwing', () => {
		expect(createValidationContext({ values, fieldPath: 'email' }).resolve('nope.nope')).toBeUndefined();
	});

	test('defaults to an empty form so a caller with no values can still build one', () => {
		const context = createValidationContext();

		expect(context.fieldPath).toBe('');
		expect(context.values).toEqual({});
		expect(context.resolve('accountType')).toBeUndefined();
	});
});
