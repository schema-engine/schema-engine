import { describe, expect, test } from 'vitest';
import { buildDependencyIndex, createDefaultValidationRegistry, shouldSurfaceDependentError } from '@/schemas/validation';

const registry = createDefaultValidationRegistry();

const passwordForm = [
	{ $type: 'input', name: 'password', rules: [{ type: 'required' }] },
	{
		$type: 'input',
		name: 'confirmPassword',
		rules: [{ type: 'relate', fields: ['password'], assert: 'allEqual' }],
	},
];

const lineItemsForm = [
	{
		$type: 'arrayElements',
		name: 'lines',
		elements: [
			{ $type: 'number', name: 'quantity', rules: [{ type: 'required' }] },
			{
				$type: 'number',
				name: 'max',
				rules: [{ type: 'relate', fields: ['quantity'], assert: 'descending', as: 'number' }],
			},
		],
	},
];

describe('buildDependencyIndex', () => {
	test('maps a dependency to the field that reads it', () => {
		const index = buildDependencyIndex(passwordForm, {}, registry);

		expect(index.watched).toEqual(['password']);
		expect(index.dependentsOf('password')).toEqual(['confirmPassword']);
	});

	test('reports no dependents for a field nothing reads', () => {
		const index = buildDependencyIndex(passwordForm, {}, registry);

		expect(index.dependentsOf('confirmPassword')).toEqual([]);
		expect(index.expand(['confirmPassword'])).toEqual([]);
	});

	test('keeps array rows independent', () => {
		const values = {
			lines: [
				{ quantity: 1, max: 2 },
				{ quantity: 3, max: 4 },
			],
		};
		const index = buildDependencyIndex(lineItemsForm, values, registry);

		expect(index.dependentsOf('lines.1.quantity')).toEqual(['lines.1.max']);
		expect(index.dependentsOf('lines.0.quantity')).toEqual(['lines.0.max']);
		expect(index.watched).toEqual(['lines.0.quantity', 'lines.1.quantity']);
	});

	test('follows the row count of the values it is built from', () => {
		const oneRow = buildDependencyIndex(lineItemsForm, { lines: [{ quantity: 1, max: 2 }] }, registry);
		const twoRows = buildDependencyIndex(
			lineItemsForm,
			{
				lines: [
					{ quantity: 1, max: 2 },
					{ quantity: 3, max: 4 },
				],
			},
			registry,
		);

		expect(oneRow.watched).toEqual(['lines.0.quantity']);
		expect(twoRows.watched).toEqual(['lines.0.quantity', 'lines.1.quantity']);
	});

	test('reads async dependencies, including dotted and sibling references', () => {
		const elements = [
			{
				$type: 'input',
				name: 'username',
				rules: [{ type: 'async', url: '/api/check', dependencies: ['email', 'billing.country'] }],
			},
		];

		expect(buildDependencyIndex(elements, {}, registry).watched).toEqual(['email', 'billing.country']);
	});

	test('unions dependents across several changed paths without repeating one', () => {
		const elements = [
			{
				$type: 'input',
				name: 'summary',
				rules: [{ type: 'relate', fields: ['a', 'b'], assert: 'atLeastOne', includeSelf: false }],
			},
		];
		const index = buildDependencyIndex(elements, {}, registry);

		expect(index.expand(['a', 'b'])).toEqual(['summary']);
	});

	test('ignores rules that read nothing beyond their own value', () => {
		const elements = [{ $type: 'input', name: 'email', rules: [{ type: 'required' }, { type: 'email' }] }];

		expect(buildDependencyIndex(elements, {}, registry).watched).toEqual([]);
	});
});

describe('shouldSurfaceDependentError', () => {
	test('stays quiet on a field the user has not reached', () => {
		expect(shouldSurfaceDependentError({ touched: false, submitted: false })).toBe(false);
	});

	test('surfaces once the field is touched, or once the form has been submitted', () => {
		expect(shouldSurfaceDependentError({ touched: true, submitted: false })).toBe(true);
		expect(shouldSurfaceDependentError({ touched: false, submitted: true })).toBe(true);
	});
});
