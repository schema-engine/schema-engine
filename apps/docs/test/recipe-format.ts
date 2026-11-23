import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** One folder per recipe, each holding the files the recipe's page shows and the tests that run them. */
export const examplesRoot = join(import.meta.dirname, '../src/lib/examples');

/** The example pages, one per recipe folder, plus the overview and the pages that use another format. */
export const examplePagesRoot = join(import.meta.dirname, '../src/content/docs/examples');

export interface RecipeFile {
	name: string;
	source: string;
}

export interface Recipe {
	id: string;
	/** The files a reader copies: every file of the folder that is not a test. */
	files: RecipeFile[];
	/** The test files of the folder. */
	tests: RecipeFile[];
}

const TEST_FILE = /\.test(\.browser)?\.tsx?$/;
const FENCE_LANGUAGE: Record<string, string> = { ts: 'ts', tsx: 'tsx', css: 'css', json: 'json', yaml: 'yaml' };
const PACKAGE_SPECIFIER = /^(@[a-z0-9~-][a-z0-9._~-]*\/)?[a-z0-9~-][a-z0-9._~-]*(\/.*)?$/;
const RELATIVE_SPECIFIER = /^\.\/[\w.-]+$/;

/** Reads every folder of `root` as a recipe, in id order. */
export function readRecipes(root = examplesRoot): Recipe[] {
	if (!existsSync(root)) return [];
	return readdirSync(root, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => {
			const files = readdirSync(join(root, entry.name))
				.toSorted()
				.map((name) => ({ name, source: readFileSync(join(root, entry.name, name), 'utf8') }));
			return {
				id: entry.name,
				files: files.filter((file) => !TEST_FILE.test(file.name)),
				tests: files.filter((file) => TEST_FILE.test(file.name)),
			};
		})
		.toSorted((a, b) => a.id.localeCompare(b.id));
}

/** A file as its page shows it: a React file drops the pragma line that only the docs app's own compiler needs. */
export function asShown(source: string): string {
	const lines = source.trimEnd().split('\n');
	return (lines[0]!.startsWith('/** @jsxImportSource') ? lines.slice(1) : lines).join('\n');
}

/** The module specifiers a file imports or re-exports. */
export function importsOf(source: string): string[] {
	return [...source.matchAll(/(?:from|import)\s*\(?\s*'([^']+)'/g)].map((match) => match[1]!);
}

/** The package a specifier names: `@scope/name` or `name`, without a subpath. */
export function packageOf(specifier: string): string {
	const parts = specifier.split('/');
	return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
}

/** The first `pnpm add` command of the page's Install section, or undefined when it has none. */
export function installLine(page: string): string | undefined {
	const section = page.split(/^## /m).find((part) => /^Install\b/.test(part));
	return section?.match(/```(?:bash|sh)\n(pnpm add [^\n]+)\n```/)?.[1];
}

/**
 * Everything that makes a recipe fail the format: a file the page does not show word for word, an import that is
 * neither a package nor a sibling, a folder without a test that runs its files, a page without the install line its
 * files need, or a recipe the overview does not list.
 */
export function checkRecipe(recipe: Recipe, page: string | undefined, overview: string): string[] {
	const problems: string[] = [];
	const names = recipe.files.map((file) => file.name);
	if (recipe.files.length === 0) problems.push('has no files');

	for (const file of recipe.files) {
		for (const specifier of importsOf(file.source)) {
			if (PACKAGE_SPECIFIER.test(specifier)) continue;
			if (!RELATIVE_SPECIFIER.test(specifier)) {
				problems.push(`${file.name} imports ${specifier}, which is not a package or a file of its own folder`);
			} else if (!names.some((name) => name.startsWith(`${specifier.slice(2)}.`))) {
				problems.push(`${file.name} imports ${specifier}, which is not a file of this recipe`);
			}
		}
	}

	if (!recipe.tests.some((test) => importsOf(test.source).some((specifier) => RELATIVE_SPECIFIER.test(specifier)))) {
		problems.push('has no test that imports its files');
	}

	if (page === undefined) {
		problems.push(`has no page examples/${recipe.id}.mdx`);
		return problems;
	}

	for (const file of recipe.files) {
		const language = FENCE_LANGUAGE[file.name.split('.').at(-1)!];
		const fence = `\`\`\`${language} title="${file.name}"\n${asShown(file.source)}\n\`\`\``;
		if (!language) problems.push(`${file.name} has a type the page cannot show`);
		else if (!page.includes(fence)) problems.push(`the page does not show ${file.name} word for word`);
	}

	const install = installLine(page);
	if (install === undefined) {
		problems.push('the page has no "Install" section with a pnpm add command');
	} else {
		const imported = new Set(recipe.files.flatMap((file) => importsOf(file.source).map(packageOf)));
		for (const name of [...imported].filter((specifier) => PACKAGE_SPECIFIER.test(specifier))) {
			if (!install.split(/\s+/).includes(name)) problems.push(`the install line lacks ${name}`);
		}
		if (!overview.includes(`\`${install}\``)) problems.push('the overview does not list its install line');
	}
	if (!overview.includes(`](/docs/examples/${recipe.id})`)) problems.push('the overview does not link to the page');

	return problems;
}
