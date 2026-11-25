import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { checkExample, examplePagesRoot, importsOf, packageOf, readExamples, type Example } from './example-format';

/** Pages of Examples that are not a folder of `src/lib/examples`: `overview` explains the format. */
const OTHER_PAGES = ['overview'];

const page = (id: string): string | undefined => {
	try {
		return readFileSync(join(examplePagesRoot, `${id}.mdx`), 'utf8');
	} catch {
		return undefined;
	}
};

const overview = page('overview') ?? '';

describe('the Examples', () => {
	const examples = readExamples();

	test.each(examples.map((example) => [example.id, example] as const))(
		'%s follows the example format',
		(_id, example) => {
			expect(checkExample(example, page(example.id), overview)).toEqual([]);
		},
	);

	test.each(['server-sent-document', 'checkout-workflow'])(
		'%s imports no UI framework and no forms package',
		(id) => {
			const example = examples.find((candidate) => candidate.id === id);
			const packages = [...(example?.files ?? []), ...(example?.helpers ?? [])].flatMap((file) =>
				importsOf(file.source).map(packageOf),
			);
			expect(packages.length).toBeGreaterThan(0);
			expect(
				packages.filter((name) => /^(react|react-dom|@ecopages\/.+|@schema-engine\/forms.*)$/.test(name)),
			).toEqual([]);
		},
	);

	test('every page of Examples is an example or is listed as another kind of page', () => {
		const ids = new Set(examples.map((example) => example.id));
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

describe('the example format checker', () => {
	const install = 'pnpm add @schema-engine/registry zod';
	const example: Example = {
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
		helpers: [],
		tests: [{ name: 'demo.test.ts', source: "import { message } from './main';\n" }],
	};
	const goodPage = [
		'## Install',
		`\`\`\`bash\n${install}\n\`\`\``,
		shown('main.ts', 'ts', example.files[0]!.source.trimEnd()),
		shown('greet.ts', 'ts', example.files[1]!.source.trimEnd()),
		shown('view.react.tsx', 'tsx', 'export const View = () => <p />;'),
	].join('\n\n');
	const goodOverview = `| [Demo](/docs/examples/demo) | Shows a thing | \`${install}\` |`;
	const problems = (changed: Partial<Example>, text: string | null = goodPage, list = goodOverview) =>
		checkExample({ ...example, ...changed }, text ?? undefined, list);

	const importing = (specifier: string) => ({
		files: [{ name: 'main.ts', source: `import { x } from '${specifier}';\n` }, example.files[2]!],
	});
	const importProblems = (specifier: string) =>
		problems(importing(specifier), goodPage).filter((problem) => problem.includes('imports'));

	test('accepts an example that has a page, a test, an install line and an overview entry', () => {
		expect(problems({})).toEqual([]);
	});

	test('fails a page that differs from a file by one character', () => {
		expect(problems({}, goodPage.replace("greet('Ada')", "greet('Ade')"))).toEqual([
			'the page does not show main.ts word for word',
		]);
		expect(problems({}, null)).toEqual(['has no page examples/demo.mdx']);
	});

	test('fails a file that imports another example, an app alias or a file that is not its own', () => {
		for (const specifier of ['../other/main', '@/lib/x', './missing']) {
			const [first] = problems(imports(specifier), goodPage);
			expect(first, specifier).toContain(`main.ts imports ${specifier}`);
		}
	});

	test('resolves a relative import to a file by its exact name, not by the start of it', () => {
		expect(importProblems('./view.react')).toEqual([]);
		expect(importProblems('./view')).toEqual(['main.ts imports ./view, which is not a file of this example']);
	});

	test('reads an import in either quote style', () => {
		expect(importsOf("import { a } from './a';")).toEqual(['./a']);
		expect(importsOf('import { a } from "./a";\nexport * from "../b";')).toEqual(['./a', '../b']);
		const [first] = problems({ files: [{ name: 'main.ts', source: 'import { x } from "@/lib/x";\n' }] }, goodPage);
		expect(first).toContain('main.ts imports @/lib/x');
	});

	test('lets a helper be imported without being shown, and fails what a hidden file would hide', () => {
		const helper = {
			name: 'clock.helper.ts',
			source: "import * as z from 'zod/mini';\nexport const now = () => z.string();\n",
		};
		const withHelper = {
			files: [
				{ name: 'main.ts', source: "import { now } from './clock.helper';\nexport const message = now();\n" },
			],
			helpers: [helper],
		};
		const page = [
			'## Install',
			`\`\`\`bash\n${install}\n\`\`\``,
			shown('main.ts', 'ts', withHelper.files[0]!.source.trimEnd()),
		].join('\n\n');
		expect(problems(withHelper, page)).toEqual([]);
		expect(problems(withHelper, `${page}\n\n${shown('clock.helper.ts', 'ts', helper.source.trimEnd())}`)).toEqual([
			'the page shows clock.helper.ts, which is not one of the files',
		]);
		expect(
			problems({ ...withHelper, files: [{ name: 'main.ts', source: 'export const message = 1;\n' }] }, page),
		).toEqual([
			'the helper clock.helper.ts is not imported by any file',
			'the page does not show main.ts word for word',
		]);
		const plain = {
			helpers: [],
			files: [
				{ name: 'main.ts', source: withHelper.files[0]!.source.replace('./clock.helper', './clock') },
				{ name: 'clock.ts', source: helper.source },
			],
		};
		expect(problems(plain, page)).toEqual([
			'the page does not show main.ts word for word',
			'the page does not show clock.ts word for word',
		]);
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

	test('fails a page whose install line misses a package, and an overview that does not list the example', () => {
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
