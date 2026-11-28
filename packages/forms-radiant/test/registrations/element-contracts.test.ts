import { defaultElementContracts } from '@schema-engine/forms/default-elements';
import { describe, expect, test } from 'vitest';
import { schemaFormRegistrations } from '@/registrations';

/** The value declaration of a registration or a contract; a container or a static element has none. */
const valueOf = (registration: object | undefined): unknown =>
	registration !== undefined && 'value' in registration ? registration.value : undefined;

describe('the Radiant elements', () => {
	test('bind every element contract, in the order of the contracts', () => {
		expect(schemaFormRegistrations.map((registration) => registration.$type)).toEqual(
			defaultElementContracts.keys(),
		);
	});

	test('share the schema, the value declaration and the metadata of each contract', () => {
		for (const contract of defaultElementContracts.all()) {
			const registration = schemaFormRegistrations.find(({ $type }) => $type === contract.$type);

			expect(registration?.schema, contract.$type).toBe(contract.schema);
			expect(registration?.metadata, contract.$type).toBe(contract.metadata);
			expect(registration?.kind, contract.$type).toBe(contract.kind);
			expect(valueOf(registration), contract.$type).toBe(valueOf(contract));
			expect(typeof registration?.render, contract.$type).toBe('function');
		}
	});

	test('add the phone validation to the phone input alone', () => {
		const withValidations = schemaFormRegistrations
			.filter((registration) => 'validations' in registration)
			.map((registration) => registration.$type);

		expect(withValidations).toEqual(['phone-input']);
	});
});
