import { describe, expect, test } from 'vitest';
import { catalog, validateCatalog } from '../../../../scripts/generate-schema-engine-registry.ts';

const github = 'andeeplus/schema-engine';

const AGGREGATES = [
	{ name: 'schema-form', depPrefix: `${github}/schema-engine-form-` },
	{ name: 'schema-form-radix', depPrefix: `${github}/schema-engine-form-` },
	{ name: 'schema-form-aria', depPrefix: `${github}/schema-engine-form-` },
];

describe('schema-engine GitHub registry catalog', () => {
	test('catalog is internally consistent', () => {
		expect(validateCatalog()).toEqual([]);
	});

	for (const aggregate of AGGREGATES) {
		test(`${aggregate.name} composes sibling items instead of re-shipping them`, () => {
			const item = catalog.find((entry) => entry.name === aggregate.name);
			expect(item).toBeDefined();
			if (!item) return;
			expect(
				item.files.every((file) => file.path.endsWith('registrations.ts') || file.path.endsWith('index.ts')),
			).toBe(true);
			expect(item.registryDependencies.every((dep) => dep.startsWith(aggregate.depPrefix))).toBe(true);
		});
	}

	test('same-repo dependencies use GitHub item addresses', () => {
		for (const item of catalog) {
			for (const dep of item.registryDependencies) {
				if (dep.includes('schema-engine-form-') || dep.startsWith('schema-form')) {
					expect(dep.startsWith(`${github}/`)).toBe(true);
				}
			}
		}
	});

	test('every file has an @components or @ui target', () => {
		for (const item of catalog) {
			for (const file of item.files) {
				expect(file.target.startsWith('@components/') || file.target.startsWith('@ui/')).toBe(true);
			}
		}
	});

	test('form wrappers live in registry/shared/forms with aria overlays only', () => {
		const sharedWrapper = catalog.find((entry) => entry.name === 'schema-engine-form-input');
		const radixWrapper = catalog.find((entry) => entry.name === 'schema-engine-form-input-radix');
		const ariaWrapper = catalog.find((entry) => entry.name === 'schema-engine-form-input-aria');
		expect(sharedWrapper?.files[0]?.path).toBe('../shared/forms/inputs/form-input.tsx');
		expect(radixWrapper?.files[0]?.path).toBe('../shared/forms/inputs/form-input.tsx');
		expect(ariaWrapper?.files[0]?.path).toBe('../shared/forms/inputs/form-input.tsx');

		const ariaCheckbox = catalog.find((entry) => entry.name === 'schema-engine-form-checkbox-aria');
		expect(ariaCheckbox?.files.some((file) => file.path === 'overlays/forms/inputs/form-checkbox.tsx')).toBe(true);
	});

	test('item names are unique across all bases', () => {
		const names = catalog.map((item) => item.name);
		expect(new Set(names).size).toBe(names.length);
	});
});
