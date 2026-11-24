import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { checkRecipe, examplePagesRoot, importsOf, packageOf, readRecipes, type Recipe } from './recipe-format';

/**
 * Pages of Examples that are not a folder of `src/lib/examples`.
 *
 * @remarks
 * `overview` explains the format. A page that shows `RecipeDemo` tabs keeps its files in `src/lib/recipes`, and
 * `test/styling-docs.test.ts` holds it to the same rules.
 */
const OTHER_PAGES = ['overview', 'layout-recipes'];

const page = (id: string): string | undefined => {
	try {
		return readFileSync(join(examplePagesRoot, `${id}.mdx`), 'utf8');
	} catch {
		return undefined;
	}
};

const overview = page('overview') ?? '';

describe('the recipes of Examples', () => {
	const recipes = readRecipes();

	test.each(recipes.map((recipe) => [recipe.id, recipe] as const))('%s follows the recipe format', (_id, recipe) => {
		expect(checkRecipe(recipe, page(recipe.id), overview)).toEqual([]);
	});

	test.each(['design-system-registry', 'server-sent-document', 'checkout-workflow', 'server-driven-workflow'])(
		'%s imports no UI framework and no forms package',
		(id) => {
			const recipe = recipes.find((candidate) => candidate.id === id);
			const packages = recipe?.files.flatMap((file) => importsOf(file.source).map(packageOf)) ?? [];
			expect(packages.length).toBeGreaterThan(0);
			expect(
				packages.filter((name) => /^(react|react-dom|@ecopages\/.+|@schema-engine\/forms.*)$/.test(name)),
			).toEqual([]);
		},
	);

	test('every page of Examples is a recipe or is listed as another kind of page', () => {
		const ids = new Set(recipes.map((recipe) => recipe.id));
		const pages = readdirSync(examplePagesRoot)
			.filter((file) => file.endsWith('.mdx'))
			.map((file) => file.replace(/\.mdx$/, ''));
		expect(pages.filter((id) => !ids.has(id) && !OTHER_PAGES.includes(id))).toEqual([]);
		expect(OTHER_PAGES.filter((id) => !pages.includes(id))).toEqual([]);
	});
});

const shown = (name: string, language: string, text: string) => `\`\`\`${language} title="${name}"\n${text}\n\`\`\``;

const imports = (specifier: string) => ({
	files: [{ name: 'main.ts', source: `import { x } from '${specifier}';\n` }],
});

describe('the recipe format checker', () => {
	const install = 'pnpm add @schema-engine/registry zod';
	const recipe: Recipe = {
		id: 'demo',
		files: [
			{ name: 'main.ts', source: "import { greet } from './greet';\nexport const message = greet('Ada');\n" },
			{
				name: 'greet.ts',
				source: "import * as z from 'zod/mini';\nexport const greet = (name: string) => z.string().parse(name);\n",
			},
			{
				name: 'view.react.tsx',
				source: '/** @jsxImportSource react */\nexport const View = () => <p />;\n',
			},
		],
		tests: [{ name: 'demo.test.ts', source: "import { message } from './main';\n" }],
	};
	const goodPage = [
		'## Install',
		`\`\`\`bash\n${install}\n\`\`\``,
		shown('main.ts', 'ts', recipe.files[0]!.source.trimEnd()),
		shown('greet.ts', 'ts', recipe.files[1]!.source.trimEnd()),
		shown('view.react.tsx', 'tsx', 'export const View = () => <p />;'),
	].join('\n\n');
	const goodOverview = `| [Demo](/docs/examples/demo) | Shows a thing | \`${install}\` |`;
	const problems = (changed: Partial<Recipe>, text: string | null = goodPage, list = goodOverview) =>
		checkRecipe({ ...recipe, ...changed }, text ?? undefined, list);

	test('accepts a recipe that has a page, a test, an install line and an overview entry', () => {
		expect(problems({})).toEqual([]);
	});

	test('fails a page that differs from a file by one character', () => {
		expect(problems({}, goodPage.replace("greet('Ada')", "greet('Ade')"))).toEqual([
			'the page does not show main.ts word for word',
		]);
		expect(problems({}, null)).toEqual(['has no page examples/demo.mdx']);
	});

	test('fails a file that imports another recipe, an app alias or a file that is not its own', () => {
		for (const specifier of ['../other/main', '@/lib/x', './missing']) {
			const [first] = problems(imports(specifier), goodPage);
			expect(first, specifier).toContain(`main.ts imports ${specifier}`);
		}
	});

	test('resolves a relative import to a file by its exact name, not by the start of it', () => {
		const importing = (specifier: string) => ({
			files: [{ name: 'main.ts', source: `import { x } from '${specifier}';\n` }, recipe.files[2]!],
		});
		const importProblems = (specifier: string) =>
			problems(importing(specifier), goodPage).filter((problem) => problem.includes('imports'));
		expect(importProblems('./view.react')).toEqual([]);
		expect(importProblems('./view')).toEqual(['main.ts imports ./view, which is not a file of this recipe']);
	});

	test('reads an import in either quote style', () => {
		expect(importsOf("import { a } from './a';")).toEqual(['./a']);
		expect(importsOf('import { a } from "./a";\nexport * from "../b";')).toEqual(['./a', '../b']);
		const [first] = problems({ files: [{ name: 'main.ts', source: 'import { x } from "@/lib/x";\n' }] }, goodPage);
		expect(first).toContain('main.ts imports @/lib/x');
	});

	test('fails a titled fence on the page for a file that is not in the folder', () => {
		expect(problems({}, `${goodPage}\n\n${shown('stale.ts', 'ts', 'export const stale = 1;')}`)).toEqual([
			'the page shows stale.ts, which is not one of the files',
		]);
	});

	test('fails a folder with no test, or a test that runs none of its files', () => {
		expect(problems({ tests: [] })).toEqual(['has no test that imports its files']);
		expect(problems({ tests: [{ name: 'demo.test.ts', source: "import { it } from 'vitest';\n" }] })).toEqual([
			'has no test that imports its files',
		]);
	});

	test('fails a page whose install line misses a package, and an overview that does not list the recipe', () => {
		const withoutZod = goodPage.replace(install, 'pnpm add @schema-engine/registry');
		expect(problems({}, withoutZod, goodOverview.replace(install, 'pnpm add @schema-engine/registry'))).toEqual([
			'the install line lacks zod',
		]);
		expect(problems({}, goodPage, '')).toEqual([
			'the overview does not list its install line',
			'the overview does not link to the page',
		]);
		expect(problems({}, goodPage.replace('## Install', '## Setup'))).toEqual([
			'the page has no "Install" section with a pnpm add command',
		]);
	});
});
