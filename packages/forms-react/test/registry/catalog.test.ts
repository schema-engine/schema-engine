import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { catalog, validateCatalog } from '../../../../scripts/generate-schema-engine-registry.ts';

const github = 'schema-engine/schema-engine';

const AGGREGATES = [
	{ name: 'schema-form', depPrefix: `${github}/schema-engine-form-` },
	{ name: 'schema-form-radix', depPrefix: `${github}/schema-engine-form-` },
	{ name: 'schema-form-aria', depPrefix: `${github}/schema-engine-form-` },
];

const RECIPE_AGGREGATES = [
	'schema-engine-form-recipes',
	'schema-engine-form-recipes-radix',
	'schema-engine-form-recipes-aria',
];

describe('schema-engine GitHub registry catalog', () => {
	test('registry source files stay within their manifest directory and exist', () => {
		const repo = path.resolve(import.meta.dirname, '../../../..');
		type Manifest = { include?: string[]; items?: Array<{ name: string; files?: Array<{ path: string }> }> };
		const names = new Set<string>();
		const check = (manifestPath: string) => {
			const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
			const manifestDir = path.dirname(manifestPath);
			for (const item of manifest.items ?? []) {
				names.add(item.name);
				for (const file of item.files ?? []) {
					expect(path.isAbsolute(file.path), `${item.name}: ${file.path}`).toBe(false);
					expect(file.path.split(/[\\/]+/), `${item.name}: ${file.path}`).not.toContain('..');
					expect(existsSync(path.resolve(manifestDir, file.path)), `${item.name}: ${file.path}`).toBe(true);
				}
			}
			for (const include of manifest.include ?? []) check(path.resolve(manifestDir, include));
		};
		check(path.join(repo, 'registry.json'));
		for (const { name } of AGGREGATES) expect(names.has(name), name).toBe(true);
		for (const name of RECIPE_AGGREGATES) expect(names.has(name), name).toBe(true);
	});
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

	for (const name of RECIPE_AGGREGATES) {
		test(`${name} installs the default recipe barrel at one path`, () => {
			const item = catalog.find((entry) => entry.name === name);
			expect(item).toBeDefined();
			expect(item?.files.some((file) => file.target.endsWith('/recipes/registrations.ts'))).toBe(true);
			expect(item?.files.some((file) => file.target.endsWith('/recipes/index.ts'))).toBe(false);
			expect(item?.registryDependencies).toEqual(expect.arrayContaining(['button', 'badge', 'separator']));
		});
	}

	for (const name of RECIPE_AGGREGATES) {
		test(`${name} copies the recipe stylesheets as registry files`, () => {
			const item = catalog.find((entry) => entry.name === name);
			const stylesheets = item?.files.filter((file) => file.path.endsWith('.css')) ?? [];
			expect(stylesheets.map((file) => file.target).toSorted()).toEqual([
				'@components/schema-engine/forms/recipes/blocks/form-actions.css',
				'@components/schema-engine/forms/recipes/blocks/minimal-progress.css',
				'@components/schema-engine/forms/recipes/blocks/step-header.css',
				'@components/schema-engine/forms/recipes/blocks/step-indicators.css',
				'@components/schema-engine/forms/recipes/blocks/wizard-actions.css',
				'@components/schema-engine/forms/recipes/recipes.css',
				'@components/schema-engine/forms/recipes/shells/card-shell.css',
				'@components/schema-engine/forms/recipes/shells/hero-shell.css',
				'@components/schema-engine/forms/recipes/shells/sidebar-shell.css',
				'@components/schema-engine/forms/recipes/shells/split-screen-shell.css',
				'@components/schema-engine/forms/recipes/shells/stack-shell.css',
			]);
			expect(stylesheets.every((file) => file.type === 'registry:file')).toBe(true);
			expect(item?.docs).toContain('recipes.css');
		});
	}

	for (const name of [
		'schema-engine-form-field-primitive',
		'schema-engine-form-field-primitive-radix',
		'schema-engine-form-field-primitive-aria',
	]) {
		test(`${name} ships controls.css as its own file, outside the recipes entry point`, () => {
			const item = catalog.find((entry) => entry.name === name);
			const stylesheet = item?.files.find((file) => file.path.endsWith('controls.css'));
			expect(stylesheet).toEqual({
				path: 'registry/shared/primitives/controls.css',
				type: 'registry:file',
				target: '@ui/schema-engine/components/controls.css',
			});
			expect(item?.docs).toContain('unlayered');
		});
	}

	test('every element that carries data-se-control depends on the field primitive that carries controls.css', () => {
		const sourceRoot = path.resolve(import.meta.dirname, '../../../..');
		const marked = catalog.filter(
			(item) =>
				item.type === 'registry:item' &&
				item.files.some(
					(file) =>
						file.path.endsWith('.tsx') &&
						readFileSync(path.resolve(sourceRoot, file.path), 'utf8').includes('data-se-control'),
				),
		);
		expect(marked.map((item) => item.name)).toContain('schema-engine-form-submit-button');
		for (const item of marked) {
			expect(
				item.registryDependencies.some((dep) => dep.includes('schema-engine-form-field-primitive')),
				item.name,
			).toBe(true);
		}
	});

	test('every recipes item depends on the field primitive that carries controls.css', () => {
		for (const name of RECIPE_AGGREGATES) {
			const item = catalog.find((entry) => entry.name === name);
			expect(item?.registryDependencies.some((dep) => dep.includes('schema-engine-form-field-primitive'))).toBe(
				true,
			);
		}
	});

	test('every recipe group that ships a stylesheet also lists the recipes.css entry point', () => {
		const manifest = JSON.parse(
			readFileSync(
				path.resolve(import.meta.dirname, '../../../../registry/shared/forms/recipes/manifest.json'),
				'utf8',
			),
		) as { recipes: Array<{ id: string; files: string[] }> };
		const styled = manifest.recipes.filter((recipe) => recipe.files.some((file) => file.endsWith('-shell.css')));
		expect(styled.map((recipe) => recipe.id)).toEqual(expect.arrayContaining(['card', 'card-wizard']));
		for (const recipe of styled) expect(recipe.files, recipe.id).toContain('recipes.css');
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
		expect(sharedWrapper?.files[0]?.path).toBe('registry/shared/forms/inputs/form-input.tsx');
		expect(radixWrapper?.files[0]?.path).toBe('registry/shared/forms/inputs/form-input.tsx');
		expect(ariaWrapper?.files[0]?.path).toBe('registry/shared/forms/inputs/form-input.tsx');

		const ariaCheckbox = catalog.find((entry) => entry.name === 'schema-engine-form-checkbox-aria');
		expect(
			ariaCheckbox?.files.some((file) => file.path === 'registry/aria/overlays/forms/inputs/form-checkbox.tsx'),
		).toBe(true);
	});

	test('item names are unique across all bases', () => {
		const names = catalog.map((item) => item.name);
		expect(new Set(names).size).toBe(names.length);
	});
});
