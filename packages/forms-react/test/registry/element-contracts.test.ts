import { defaultElementContracts } from '@schema-engine/forms/default-elements';
import { describe, expect, test } from 'vitest';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';

/** The value declaration of a registration or a contract; a container or a static element has none. */
const valueOf = (registration: object | undefined): unknown =>
	registration !== undefined && 'value' in registration ? registration.value : undefined;

describe('the shadcn registry elements', () => {
	const byType = new Map<string, (typeof schemaFormRegistrations)[number]>(
		schemaFormRegistrations.map((registration) => [registration.$type, registration]),
	);

	test('bind every element contract', () => {
		expect(defaultElementContracts.keys().filter((type) => !byType.has(type))).toEqual([]);
	});

	test('share the schema, the metadata, the kind and the value declaration of each contract', () => {
		for (const contract of defaultElementContracts.all()) {
			const registration = byType.get(contract.$type);

			expect(registration?.schema, contract.$type).toBe(contract.schema);
			expect(registration?.metadata, contract.$type).toBe(contract.metadata);
			expect(registration?.kind, contract.$type).toBe(contract.kind);
			expect(valueOf(registration), contract.$type).toBe(valueOf(contract));
			expect(typeof registration?.render, contract.$type).toBe('function');
		}
	});

	test('keep the elements that only this renderer has', () => {
		expect([...byType.keys()].filter((type) => !defaultElementContracts.has(type)).toSorted()).toEqual([
			'date',
			'date-range',
		]);
	});
});
