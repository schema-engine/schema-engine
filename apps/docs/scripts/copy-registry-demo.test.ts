import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { copyRegistryDemo } from './copy-registry-demo';

const ALIAS = '@/copy';

async function filesUnder(root: string): Promise<string[]> {
	const entries = await readdir(root, { recursive: true, withFileTypes: true });
	return entries.filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name));
}

/** The file an import specifier names inside the copy, trying the extensions a bundler would. */
function resolveInCopy(root: string, from: string, specifier: string): string | undefined {
	const base = specifier.startsWith(`${ALIAS}/`)
		? join(root, specifier.slice(ALIAS.length + 1))
		: join(dirname(from), specifier);
	return ['', '.ts', '.tsx', '.css', '/index.ts'].map((ext) => `${base}${ext}`).find((path) => existsSync(path));
}

describe('copyRegistryDemo', () => {
	let root: string;
	let files: string[];

	beforeAll(async () => {
		root = await mkdtemp(join(tmpdir(), 'registry-demo-'));
		await copyRegistryDemo(root, ALIAS);
		files = await filesUnder(root);
	});

	afterAll(async () => {
		await rm(root, { recursive: true, force: true });
	});

	test('copies the fields, the card recipe, their primitives and styles to shadcn target paths', () => {
		const copied = files.map((file) => relative(root, file));
		expect(copied).toEqual(
			expect.arrayContaining([
				'components/schema-engine/forms/inputs/form-input.react.tsx',
				'components/schema-engine/forms/inputs/form-input.registration.ts',
				'components/schema-engine/forms/inputs/form-textarea.react.tsx',
				'components/schema-engine/forms/inputs/form-select.react.tsx',
				'components/schema-engine/forms/inputs/form-switch.react.tsx',
				'components/schema-engine/forms/actions/submit-button.react.tsx',
				'components/ui/textarea.react.tsx',
				'components/ui/select.react.tsx',
				'components/ui/switch.react.tsx',
				'components/schema-engine/forms/recipes/registrations/card.ts',
				'components/schema-engine/forms/recipes/shells/card-shell.react.tsx',
				'components/schema-engine/forms/recipes/shells/card-shell.css',
				'components/schema-engine/forms/recipes/recipes.css',
				'components/schema-engine/forms/recipes/blocks/form-actions.css',
				'components/schema-engine/forms/recipes/blocks/step-header.css',
				'components/ui/schema-engine/components/field.react.tsx',
				'components/ui/schema-engine/components/controls.css',
				'components/ui/input.react.tsx',
				'components/ui/button.react.tsx',
				'lib/utils.ts',
			]),
		);
		expect(copied.some((file) => file.includes('hero-shell'))).toBe(false);
	});

	test('the copied recipes.css imports only the stylesheets that were copied', async () => {
		const entry = await readFile(join(root, 'components/schema-engine/forms/recipes/recipes.css'), 'utf8');
		const imports = [...entry.matchAll(/@import '\.\/([^']+)';/g)].map((match) => match[1]).toSorted();

		expect(imports).toEqual(['blocks/form-actions.css', 'blocks/step-header.css', 'shells/card-shell.css']);
		for (const stylesheet of imports) {
			expect(files.map((file) => relative(root, file))).toContain(
				`components/schema-engine/forms/recipes/${stylesheet}`,
			);
		}
	});

	test('components are React-owned files with the React JSX pragma', async () => {
		const components = files.filter((file) => file.endsWith('.tsx'));
		expect(components.length).toBeGreaterThan(0);
		for (const file of components) {
			expect(file.endsWith('.react.tsx'), file).toBe(true);
			expect((await readFile(file, 'utf8')).startsWith('/** @jsxImportSource react */\n'), file).toBe(true);
		}
	});

	test('every import of the copy points at a file in the copy, and none keeps the consumer alias', async () => {
		for (const file of files.filter((candidate) => /\.tsx?$/.test(candidate))) {
			const source = await readFile(file, 'utf8');
			expect(source, file).not.toMatch(/from\s+['"]@\/(components|lib)\//);
			for (const [, specifier] of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
				if (!specifier!.startsWith('.') && !specifier!.startsWith(`${ALIAS}/`)) continue;
				expect(
					resolveInCopy(root, file, specifier!),
					`${relative(root, file)} imports ${specifier}`,
				).toBeDefined();
			}
		}
	});

	test('the package imports stay package imports, so provider and hooks share one module', async () => {
		const field = await readFile(join(root, 'components/schema-engine/forms/inputs/form-input.react.tsx'), 'utf8');
		expect(field).toContain("from '@schema-engine/forms-react/hooks'");
		expect(field).not.toContain('registry/');
	});
});
