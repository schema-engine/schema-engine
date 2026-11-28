import { safeParseStandardSchema } from '@schema-engine/registry';
import { describe, expect, test } from 'vitest';
import { defaultElementContracts, maskedInputFieldValue, sliderFieldValue } from '../../src/default-elements';

describe('the element contracts', () => {
	test('name each element once, with the kind the engine reads', () => {
		expect(defaultElementContracts.size).toBe(18);
		expect(defaultElementContracts.get('submit')?.kind).toBe('static');
		expect(defaultElementContracts.get('arrayElements')).toMatchObject({ kind: 'input', containerKind: 'array' });
		expect(defaultElementContracts.get('input')?.kind).toBe('input');
	});

	test('hold no part of a renderer', () => {
		for (const contract of defaultElementContracts.all()) {
			expect(contract, contract.$type).not.toHaveProperty('render');
			expect(contract, contract.$type).not.toHaveProperty('validations');
		}
	});

	test('declare childPaths on exactly the containers, and no other element', () => {
		const withChildPaths = defaultElementContracts
			.all()
			.filter((contract) => 'childPaths' in contract)
			.map((contract) => contract.$type);

		expect(withChildPaths.toSorted()).toEqual(['arrayElements', 'fieldSet']);
		expect(defaultElementContracts.get('fieldSet')?.childPaths).toEqual([{ keys: ['elements'] }]);
		expect(defaultElementContracts.get('arrayElements')?.childPaths).toEqual([{ keys: ['elements'] }]);
	});

	test('declare the value an input writes, and none for a container or a static element', () => {
		const withoutValue = defaultElementContracts
			.all()
			.filter((contract) => !('value' in contract))
			.map((contract) => contract.$type);

		expect(withoutValue.toSorted()).toEqual(['arrayElements', 'fieldSet', 'submission-alert', 'submit']);
	});

	test('take the typed value of a masked input as text, a number or a date', () => {
		const typed = maskedInputFieldValue({ unmask: 'typed' });
		const text = maskedInputFieldValue({ unmask: true });

		expect(safeParseStandardSchema(typed, 5).success).toBe(true);
		expect(safeParseStandardSchema(typed, new Date()).success).toBe(true);
		expect(safeParseStandardSchema(text, 5).success).toBe(false);
	});

	test('hold a slider value to the bounds of its configuration', () => {
		const value = sliderFieldValue({ min: 0, max: 10 });

		expect(safeParseStandardSchema(value, 10).success).toBe(true);
		expect(safeParseStandardSchema(value, 11).success).toBe(false);
	});
});
