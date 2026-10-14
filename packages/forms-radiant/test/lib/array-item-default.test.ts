import { describe, expect, test } from 'vitest';
import { createArrayItemDefaultValue } from '@/lib/array-item-default';

describe('array item defaults', () => {
	test('uses a single leaf default as a scalar row value', () => {
		expect(createArrayItemDefaultValue({ elements: [{ name: 'tag', defaultValue: 'Ada' }] })).toBe('Ada');
	});

	test('maps defaults from multiple children into an object row', () => {
		expect(
			createArrayItemDefaultValue({
				elements: [{ name: 'name', defaultValue: 'Ada' }, { name: 'email' }],
			}),
		).toEqual({ name: 'Ada', email: '' });
	});

	test('keeps a single fieldset child nested under its object path', () => {
		expect(
			createArrayItemDefaultValue({
				elements: [
					{
						$type: 'fieldSet',
						name: 'address',
						elements: [{ name: 'street', defaultValue: '1 Main' }],
					},
				],
			}),
		).toEqual({ address: { street: '1 Main' } });
	});
});
