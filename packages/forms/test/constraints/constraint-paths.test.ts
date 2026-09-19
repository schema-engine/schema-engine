import { describe, expect, test } from 'vitest';
import { evaluateConstraints, resolveConstraintPath, resolveConstraintPaths } from '@/constraints';
import type { ConstraintLogic } from '@/schemas';

const showWhenBusiness: ConstraintLogic[] = [
	{ field: 'accountType', operator: 'equals', value: 'business', action: 'show' },
];

describe('resolveConstraintPath', () => {
	test('scopes a sibling to the array row that declares it', () => {
		expect(resolveConstraintPath('accountType', 'contacts.0.email')).toBe('contacts.0.accountType');
		expect(resolveConstraintPath('accountType', 'contacts.12.email')).toBe('contacts.12.accountType');
	});

	test('scopes a sibling to the object that declares it', () => {
		expect(resolveConstraintPath('country', 'address.street')).toBe('address.country');
	});

	test('leaves a top-level field at the root', () => {
		expect(resolveConstraintPath('accountType', 'email')).toBe('accountType');
		expect(resolveConstraintPath('accountType', undefined)).toBe('accountType');
	});

	test('treats a dotted constraint field as absolute', () => {
		expect(resolveConstraintPath('billing.accountType', 'contacts.0.email')).toBe('billing.accountType');
	});

	test('addresses a scalar array item by its own path', () => {
		expect(resolveConstraintPath('label', 'tags.0')).toBe('tags.0.label');
	});
});

describe('resolveConstraintPaths', () => {
	test('preserves declaration order so subscribers can zip values back by index', () => {
		const constraints: ConstraintLogic[] = [
			{ field: 'b', operator: 'equals', value: 1, action: 'show' },
			{ field: 'a', operator: 'equals', value: 2, action: 'show' },
		];

		expect(resolveConstraintPaths(constraints, 'items.3.name')).toEqual(['items.3.b', 'items.3.a']);
	});
});

describe('evaluateConstraints', () => {
	test('reads the declaring row, not the first row', () => {
		const values = {
			contacts: [
				{ accountType: 'personal', email: '' },
				{ accountType: 'business', email: '' },
			],
		};

		expect(
			evaluateConstraints({ constraints: showWhenBusiness, values, fieldPath: 'contacts.0.email' }).shouldShow,
		).toBe(false);
		expect(
			evaluateConstraints({ constraints: showWhenBusiness, values, fieldPath: 'contacts.1.email' }).shouldShow,
		).toBe(true);
	});

	test('reads a sibling inside the declaring object', () => {
		const values = { address: { country: 'it', vat: '' }, country: 'us' };
		const constraints: ConstraintLogic[] = [{ field: 'country', operator: 'equals', value: 'it', action: 'show' }];

		expect(evaluateConstraints({ constraints, values, fieldPath: 'address.vat' }).shouldShow).toBe(true);
	});

	test('an absent path evaluates as undefined rather than throwing', () => {
		expect(evaluateConstraints({ constraints: showWhenBusiness, values: {} }).shouldShow).toBe(false);
	});

	test('compares a single-selection value as its element', () => {
		const constraints: ConstraintLogic[] = [
			{ field: 'interests', operator: 'equals', value: 'sports', action: 'show' },
		];

		expect(evaluateConstraints({ constraints, values: { interests: ['sports'] } }).shouldShow).toBe(true);
		expect(evaluateConstraints({ constraints, values: { interests: ['music'] } }).shouldShow).toBe(false);
		expect(evaluateConstraints({ constraints, values: { interests: ['sports', 'music'] } }).shouldShow).toBe(false);
	});

	test('reports disable and require alongside visibility', () => {
		const values = { accountType: 'business' };
		const constraints: ConstraintLogic[] = [
			{ field: 'accountType', operator: 'equals', value: 'business', action: 'require' },
			{ field: 'accountType', operator: 'equals', value: 'personal', action: 'disable' },
		];

		expect(evaluateConstraints({ constraints, values })).toEqual({
			shouldShow: true,
			shouldDisable: false,
			isRequired: true,
		});
	});

	test('keeps a base-required field required when no constraint requires it', () => {
		expect(evaluateConstraints({ constraints: showWhenBusiness, values: {}, baseRequired: true }).isRequired).toBe(
			true,
		);
	});
});
