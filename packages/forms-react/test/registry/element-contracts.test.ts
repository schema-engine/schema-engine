import { elementContracts } from '@schema-engine/forms/elements';
import { describe, expect, test } from 'vitest';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';

describe('the shadcn registry elements', () => {
	const byType = new Map<string, (typeof schemaFormRegistrations)[number]>(
		schemaFormRegistrations.map((registration) => [registration.$type, registration]),
	);

	test('bind every element contract', () => {
		expect(elementContracts.keys().filter((type) => !byType.has(type))).toEqual([]);
	});

	test('share the schema, the metadata and the kind of each contract', () => {
		for (const contract of elementContracts.all()) {
			const registration = byType.get(contract.$type);

			expect(registration?.schema, contract.$type).toBe(contract.schema);
			expect(registration?.metadata, contract.$type).toBe(contract.metadata);
			expect(registration?.kind, contract.$type).toBe(contract.kind);
			expect(typeof registration?.render, contract.$type).toBe('function');
		}
	});

	test('keep the elements that only this renderer has', () => {
		expect([...byType.keys()].filter((type) => !elementContracts.has(type)).toSorted()).toEqual([
			'date',
			'date-range',
		]);
	});
});
