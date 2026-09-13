import { describe, expect, test } from 'vitest';
import { readHydratedRules } from '@/components/internals/field-rule-hydrator';

describe('readHydratedRules', () => {
	test('revives serialized validation rules when the field has no live rules', () => {
		const field = document.createElement('se-field');
		field.setAttribute(
			'data-se-validation-rules',
			JSON.stringify([{ type: 'required', message: 'Name is required' }]),
		);

		expect(readHydratedRules(field)?.required).toBe('Name is required');
	});

	test('preserves a live validator instead of replacing it from markup', () => {
		const field = document.createElement('se-field');
		Reflect.set(field, 'rules', { validate: () => true });
		field.setAttribute(
			'data-se-validation-rules',
			JSON.stringify([{ type: 'required', message: 'Name is required' }]),
		);

		expect(readHydratedRules(field)).toBeUndefined();
	});
});
