import { describe, test, expect } from 'vitest';
import { evaluateResolvedConstraints } from '../../src/constraints/constraint-evaluator';
import type { ConstraintLogic } from '../../src/schemas';

function evaluate(input: {
	constraints?: readonly ConstraintLogic[];
	fieldValues: Record<string, unknown>;
	baseRequired?: boolean;
}) {
	return evaluateResolvedConstraints(input.constraints ?? [], input.fieldValues, input.baseRequired);
}

describe('evaluateResolvedConstraints', () => {
	describe('equals operator', () => {
		test('should return true when values match exactly', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'status',
					operator: 'equals',
					value: 'active',
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { status: 'active' },
			});

			expect(result.shouldShow).toBe(true);
		});

		test('should return false when values do not match', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'status',
					operator: 'equals',
					value: 'active',
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { status: 'inactive' },
			});

			expect(result.shouldShow).toBe(false);
		});

		test('should handle numeric equality', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'count',
					operator: 'equals',
					value: 5,
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { count: 5 },
			});

			expect(result.shouldShow).toBe(true);
		});
	});

	describe('not_equals operator', () => {
		test('should return true when values do not match', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'status',
					operator: 'not_equals',
					value: 'active',
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { status: 'inactive' },
			});

			expect(result.shouldShow).toBe(true);
		});

		test('should return false when values match', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'status',
					operator: 'not_equals',
					value: 'active',
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { status: 'active' },
			});

			expect(result.shouldShow).toBe(false);
		});
	});

	describe('contains operator', () => {
		test('should check if watched value is in array', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'inquiryType',
					operator: 'contains',
					value: ['sales', 'partnership'],
					$type: 'show',
				},
			];

			const result1 = evaluate({
				constraints,
				fieldValues: { inquiryType: 'sales' },
			});
			expect(result1.shouldShow).toBe(true);

			const result2 = evaluate({
				constraints,
				fieldValues: { inquiryType: 'partnership' },
			});
			expect(result2.shouldShow).toBe(true);

			const result3 = evaluate({
				constraints,
				fieldValues: { inquiryType: 'support' },
			});
			expect(result3.shouldShow).toBe(false);
		});

		test('should check if string value is contained in watched value', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'email',
					operator: 'contains',
					value: '@example.com',
					$type: 'show',
				},
			];

			const result1 = evaluate({
				constraints,
				fieldValues: { email: 'user@example.com' },
			});
			expect(result1.shouldShow).toBe(true);

			const result2 = evaluate({
				constraints,
				fieldValues: { email: 'user@other.com' },
			});
			expect(result2.shouldShow).toBe(false);
		});

		test('should handle empty or null watched values when checking string contains', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'text',
					operator: 'contains',
					value: 'test',
					$type: 'show',
				},
			];

			const result1 = evaluate({
				constraints,
				fieldValues: { text: '' },
			});
			expect(result1.shouldShow).toBe(false);

			const result2 = evaluate({
				constraints,
				fieldValues: { text: null },
			});
			expect(result2.shouldShow).toBe(false);
		});

		test('does not stringify object values for text containment', () => {
			const constraints: ConstraintLogic[] = [
				{ field: 'value', operator: 'contains', value: 'object', $type: 'show' },
			];

			const result = evaluate({ constraints, fieldValues: { value: { name: 'object' } } });

			expect(result.shouldShow).toBe(false);
		});
	});

	describe('not_contains operator', () => {
		test('should check if watched value is not in array', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'role',
					operator: 'not_contains',
					value: ['admin', 'superuser'],
					$type: 'show',
				},
			];

			const result1 = evaluate({
				constraints,
				fieldValues: { role: 'user' },
			});
			expect(result1.shouldShow).toBe(true);

			const result2 = evaluate({
				constraints,
				fieldValues: { role: 'admin' },
			});
			expect(result2.shouldShow).toBe(false);
		});

		test('should check if string value is not contained in watched value', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'email',
					operator: 'not_contains',
					value: 'spam',
					$type: 'show',
				},
			];

			const result1 = evaluate({
				constraints,
				fieldValues: { email: 'user@example.com' },
			});
			expect(result1.shouldShow).toBe(true);

			const result2 = evaluate({
				constraints,
				fieldValues: { email: 'spam@example.com' },
			});
			expect(result2.shouldShow).toBe(false);
		});

		test('does not stringify object values for negative text containment', () => {
			const constraints: ConstraintLogic[] = [
				{ field: 'value', operator: 'not_contains', value: 'object', $type: 'show' },
			];

			const result = evaluate({ constraints, fieldValues: { value: { name: 'object' } } });

			expect(result.shouldShow).toBe(false);
		});
	});

	describe('greater_than operator', () => {
		test('should return true when watched value is greater', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'age',
					operator: 'greater_than',
					value: 18,
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { age: 25 },
			});

			expect(result.shouldShow).toBe(true);
		});

		test('should return false when watched value is less or equal', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'age',
					operator: 'greater_than',
					value: 18,
					$type: 'show',
				},
			];

			const result1 = evaluate({
				constraints,
				fieldValues: { age: 18 },
			});
			expect(result1.shouldShow).toBe(false);

			const result2 = evaluate({
				constraints,
				fieldValues: { age: 15 },
			});
			expect(result2.shouldShow).toBe(false);
		});

		test('should handle string numbers', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'count',
					operator: 'greater_than',
					value: '10',
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { count: '15' },
			});

			expect(result.shouldShow).toBe(true);
		});
	});

	describe('less_than operator', () => {
		test('should return true when watched value is less', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'price',
					operator: 'less_than',
					value: 100,
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { price: 50 },
			});

			expect(result.shouldShow).toBe(true);
		});

		test('should return false when watched value is greater or equal', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'price',
					operator: 'less_than',
					value: 100,
					$type: 'show',
				},
			];

			const result1 = evaluate({
				constraints,
				fieldValues: { price: 100 },
			});
			expect(result1.shouldShow).toBe(false);

			const result2 = evaluate({
				constraints,
				fieldValues: { price: 150 },
			});
			expect(result2.shouldShow).toBe(false);
		});
	});

	describe('is_empty operator', () => {
		test('should return true for empty values', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'optional',
					operator: 'is_empty',
					value: null,
					$type: 'show',
				},
			];

			const testCases = ['', null, undefined];

			for (const testValue of testCases) {
				const result = evaluate({
					constraints,
					fieldValues: { optional: testValue },
				});
				expect(result.shouldShow).toBe(true);
			}
		});

		test('should return true for empty arrays', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'items',
					operator: 'is_empty',
					value: null,
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { items: [] },
			});

			expect(result.shouldShow).toBe(true);
		});

		test('should return false for non-empty arrays', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'items',
					operator: 'is_empty',
					value: null,
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { items: ['item1', 'item2'] },
			});

			expect(result.shouldShow).toBe(false);
		});

		test('should return false for non-empty values', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'optional',
					operator: 'is_empty',
					value: null,
					$type: 'show',
				},
			];

			const testCases = ['text', 1, true, false, 0, { key: 'value' }, ['item']];

			for (const testValue of testCases) {
				const result = evaluate({
					constraints,
					fieldValues: { optional: testValue },
				});
				expect(result.shouldShow).toBe(false);
			}
		});
	});

	describe('is_not_empty operator', () => {
		test('should return true for non-empty values', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'required',
					operator: 'is_not_empty',
					value: null,
					$type: 'show',
				},
			];

			const testCases = ['text', 1, true, { key: 'value' }, ['item']];

			for (const testValue of testCases) {
				const result = evaluate({
					constraints,
					fieldValues: { required: testValue },
				});
				expect(result.shouldShow).toBe(true);
			}
		});

		test('should return true for non-empty arrays', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'items',
					operator: 'is_not_empty',
					value: null,
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { items: ['item1', 'item2'] },
			});

			expect(result.shouldShow).toBe(true);
		});

		test('should return false for empty arrays', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'items',
					operator: 'is_not_empty',
					value: null,
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { items: [] },
			});

			expect(result.shouldShow).toBe(false);
		});

		test('should return false for empty values', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'required',
					operator: 'is_not_empty',
					value: null,
					$type: 'show',
				},
			];

			const testCases = ['', null, undefined];

			for (const testValue of testCases) {
				const result = evaluate({
					constraints,
					fieldValues: { required: testValue },
				});
				expect(result.shouldShow).toBe(false);
			}
		});

		test('treats false and zero as non-empty values', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'quantity',
					operator: 'is_not_empty',
					value: null,
					$type: 'show',
				},
			];

			for (const value of [false, 0]) {
				const result = evaluate({ constraints, fieldValues: { quantity: value } });
				expect(result.shouldShow).toBe(true);
			}
		});
	});

	describe('show constraint', () => {
		test('should show when single show constraint is met', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'type',
					operator: 'equals',
					value: 'premium',
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { type: 'premium' },
			});

			expect(result.shouldShow).toBe(true);
		});

		test('should hide when single show constraint is not met', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'type',
					operator: 'equals',
					value: 'premium',
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { type: 'basic' },
			});

			expect(result.shouldShow).toBe(false);
		});

		test('should show when any of multiple show constraints is met (OR logic)', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'type',
					operator: 'equals',
					value: 'premium',
					$type: 'show',
				},
				{
					field: 'role',
					operator: 'equals',
					value: 'admin',
					$type: 'show',
				},
			];

			const result1 = evaluate({
				constraints,
				fieldValues: { type: 'premium', role: 'user' },
			});
			expect(result1.shouldShow).toBe(true);

			const result2 = evaluate({
				constraints,
				fieldValues: { type: 'basic', role: 'admin' },
			});
			expect(result2.shouldShow).toBe(true);

			const result3 = evaluate({
				constraints,
				fieldValues: { type: 'basic', role: 'user' },
			});
			expect(result3.shouldShow).toBe(false);
		});
	});

	describe('hide constraint', () => {
		test('should hide when hide constraint is met', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'status',
					operator: 'equals',
					value: 'disabled',
					$type: 'hide',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { status: 'disabled' },
			});

			expect(result.shouldShow).toBe(false);
		});

		test('should show when hide constraint is not met', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'status',
					operator: 'equals',
					value: 'disabled',
					$type: 'hide',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { status: 'active' },
			});

			expect(result.shouldShow).toBe(true);
		});

		test('should hide when any hide constraint is met even if show constraint is met', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'type',
					operator: 'equals',
					value: 'premium',
					$type: 'show',
				},
				{
					field: 'status',
					operator: 'equals',
					value: 'disabled',
					$type: 'hide',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { type: 'premium', status: 'disabled' },
			});

			expect(result.shouldShow).toBe(false);
		});
	});

	describe('disable constraint', () => {
		test('should disable when disable constraint is met', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'locked',
					operator: 'equals',
					value: true,
					$type: 'disable',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { locked: true },
			});

			expect(result.shouldDisable).toBe(true);
		});

		test('should not disable when disable constraint is not met', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'locked',
					operator: 'equals',
					value: true,
					$type: 'disable',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { locked: false },
			});

			expect(result.shouldDisable).toBe(false);
		});
	});

	describe('enable constraint', () => {
		test('should disable when enable constraint is not met', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'hasPermission',
					operator: 'equals',
					value: true,
					$type: 'enable',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { hasPermission: false },
			});

			expect(result.shouldDisable).toBe(true);
		});

		test('should not disable when enable constraint is met', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'hasPermission',
					operator: 'equals',
					value: true,
					$type: 'enable',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { hasPermission: true },
			});

			expect(result.shouldDisable).toBe(false);
		});
	});

	describe('require constraint', () => {
		test('should mark as required when require constraint is met', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'type',
					operator: 'equals',
					value: 'business',
					$type: 'require',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { type: 'business' },
			});

			expect(result.isRequired).toBe(true);
		});

		test('should not mark as required when require constraint is not met', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'type',
					operator: 'equals',
					value: 'business',
					$type: 'require',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { type: 'personal' },
			});

			expect(result.isRequired).toBe(false);
		});

		test('should respect baseRequired parameter', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'type',
					operator: 'equals',
					value: 'business',
					$type: 'require',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { type: 'personal' },
				baseRequired: true,
			});

			expect(result.isRequired).toBe(true);
		});

		test('should be required when either baseRequired or constraint is met', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'type',
					operator: 'equals',
					value: 'business',
					$type: 'require',
				},
			];

			const result1 = evaluate({
				constraints,
				fieldValues: { type: 'business' },
				baseRequired: false,
			});
			expect(result1.isRequired).toBe(true);

			const result2 = evaluate({
				constraints,
				fieldValues: { type: 'personal' },
				baseRequired: true,
			});
			expect(result2.isRequired).toBe(true);

			const result3 = evaluate({
				constraints,
				fieldValues: { type: 'business' },
				baseRequired: true,
			});
			expect(result3.isRequired).toBe(true);
		});
	});

	describe('no constraints', () => {
		test('should show field by default when no constraints provided', () => {
			const result = evaluate({
				fieldValues: {},
			});

			expect(result.shouldShow).toBe(true);
		});

		test('should not disable field by default when no constraints provided', () => {
			const result = evaluate({
				fieldValues: {},
			});

			expect(result.shouldDisable).toBe(false);
		});

		test('should respect baseRequired when no constraints provided', () => {
			const result1 = evaluate({
				fieldValues: {},
				baseRequired: false,
			});
			expect(result1.isRequired).toBe(false);

			const result2 = evaluate({
				fieldValues: {},
				baseRequired: true,
			});
			expect(result2.isRequired).toBe(true);
		});
	});

	describe('complex scenarios', () => {
		test('should handle multiple constraints with different actions', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'userType',
					operator: 'equals',
					value: 'premium',
					$type: 'show',
				},
				{
					field: 'status',
					operator: 'not_equals',
					value: 'suspended',
					$type: 'enable',
				},
				{
					field: 'agreeToTerms',
					operator: 'equals',
					value: true,
					$type: 'require',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: {
					userType: 'premium',
					status: 'active',
					agreeToTerms: true,
				},
			});

			expect(result.shouldShow).toBe(true);
			expect(result.shouldDisable).toBe(false);
			expect(result.isRequired).toBe(true);
		});

		test('should handle missing field values gracefully', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'nonexistent',
					operator: 'equals',
					value: 'test',
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: {},
			});

			expect(result.shouldShow).toBe(false);
		});

		test('should handle real-world scenario: conditional budget field', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'inquiryType',
					operator: 'contains',
					value: ['sales', 'partnership'],
					$type: 'show',
				},
			];

			const resultSales = evaluate({
				constraints,
				fieldValues: { inquiryType: 'sales' },
			});
			expect(resultSales.shouldShow).toBe(true);

			const resultPartnership = evaluate({
				constraints,
				fieldValues: { inquiryType: 'partnership' },
			});
			expect(resultPartnership.shouldShow).toBe(true);

			const resultSupport = evaluate({
				constraints,
				fieldValues: { inquiryType: 'support' },
			});
			expect(resultSupport.shouldShow).toBe(false);
		});
	});

	describe('edge cases', () => {
		test('should handle undefined operator gracefully', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'test',
					// @ts-expect-error: Testing invalid operator handling
					operator: 'invalid_operator',
					value: 'test',
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { test: 'test' },
			});

			expect(result.shouldShow).toBe(false);
		});

		test('should handle empty constraints array', () => {
			const result = evaluate({
				constraints: [],
				fieldValues: { test: 'value' },
			});

			expect(result.shouldShow).toBe(true);
			expect(result.shouldDisable).toBe(false);
			expect(result.isRequired).toBe(false);
		});

		test('should handle constraints with no matching $type', () => {
			const constraints: ConstraintLogic[] = [
				{
					field: 'test',
					operator: 'equals',
					value: 'value',
					$type: 'show',
				},
			];

			const result = evaluate({
				constraints,
				fieldValues: { test: 'other' },
			});

			expect(result.shouldDisable).toBe(false);
			expect(result.isRequired).toBe(false);
		});
	});
});
