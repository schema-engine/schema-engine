import { elementContracts } from '@schema-engine/forms/elements';
import { describe, expect, test } from 'vitest';
import { schemaFormRegistrations } from '@/registrations';
import { radiantElements } from '@/elements/radiant-elements';

describe('the Radiant elements', () => {
	test('bind every element contract, in the order of the contracts', () => {
		expect(radiantElements.keys()).toEqual(elementContracts.keys());
		expect(schemaFormRegistrations.map((registration) => registration.$type)).toEqual(elementContracts.keys());
	});

	test('share the schema, the value declaration and the metadata of each contract', () => {
		for (const contract of elementContracts.all()) {
			const registration = radiantElements.get(contract.$type);

			expect(registration?.schema, contract.$type).toBe(contract.schema);
			expect(registration?.metadata, contract.$type).toBe(contract.metadata);
			expect(registration?.kind, contract.$type).toBe(contract.kind);
			expect(typeof registration?.render, contract.$type).toBe('function');
		}
	});

	test('add the phone validation to the phone input alone', () => {
		const withValidations = radiantElements
			.all()
			.filter((registration) => 'validations' in registration)
			.map((registration) => registration.$type);

		expect(withValidations).toEqual(['phone-input']);
	});
});
