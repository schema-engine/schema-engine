import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { docsPageIds, readPage } from './snippet-harness';

const repository = join(import.meta.dirname, '../../..');

/**
 * The pages that may mention the shadcn registry, each with the reason.
 *
 * @remarks
 * shadcn, Tailwind and the `@/` alias are one way to get ready-made React fields, never a requirement. Only the
 * pages that are about that path say so, and each mention says that it applies to the copied source.
 */
const SHADCN_PAGES: Record<string, string> = {
	'forms-react/getting-started': 'The optional second path of the React quick start.',
	'forms-react/components': 'The fields the shadcn registry installs and how to own them.',
	'forms-react/layouts': 'The default view recipes the shadcn registry installs.',
	'layout/theming': 'The colour roles the React registry controls read.',
	'layout/appearance-axes': 'What the React registry controls read of the size and tone axes.',
	'examples/overview': 'The React path of the layout examples starts from the shadcn registry.',
	'examples/theming': 'The colour roles a shadcn theme reads, which the tone axis sets.',
};

/** What the docs app's own MDX imports look like: `import { X } from '@/components/x'`. They are not prose. */
const withoutMdxImports = (text: string) => text.replace(/^import .+ from '@\/[^']+';?$/gm, '');

const SHADCN = /shadcn|@\/components\/(?:schema-engine|ui)\//i;

/** Form libraries the project does not use, and a framework it does not render with. Standard Schema validators are fine. */
const UNUSED = /react[- ]hook[- ]form|rhfAdapter|\bformik\b|tanstack[- ]form|@tanstack\/(?:react-)?form|\bvue\b/i;

describe('shadcn is optional', () => {
	test.each(docsPageIds().filter((page) => !(page in SHADCN_PAGES)))('%s does not mention shadcn', (page) => {
		expect(withoutMdxImports(readPage(page)).match(SHADCN)?.[0]).toBeUndefined();
	});

	test('every page of the list still mentions shadcn, so the list stays as short as it can be', () => {
		for (const page of Object.keys(SHADCN_PAGES)) {
			expect(SHADCN.test(withoutMdxImports(readPage(page))), `${page} no longer mentions shadcn`).toBe(true);
			expect(SHADCN_PAGES[page]?.trim(), `${page} needs a reason`).not.toBe('');
		}
	});
});

describe('no unused library is named', () => {
	const files = [
		'README.md',
		'ABOUT.md',
		'CONTEXT.md',
		...readdirSync(join(repository, 'packages')).map((name) => `packages/${name}/README.md`),
	];

	test.each(docsPageIds())('%s names no form library the project does not use', (page) => {
		expect(readPage(page).match(UNUSED)?.[0]).toBeUndefined();
	});

	test.each(files)('%s names no form library the project does not use', (file) => {
		expect(readFileSync(join(repository, file), 'utf8').match(UNUSED)?.[0]).toBeUndefined();
	});

	test('the guard names the libraries it forbids and leaves the validators alone', () => {
		for (const name of ['React Hook Form', 'react-hook-form', 'Formik', 'TanStack Form', 'Vue', 'rhfAdapter']) {
			expect(UNUSED.test(`Works with ${name}.`), name).toBe(true);
		}
		for (const name of ['Zod', 'Valibot', 'Effect Schema', 'Standard Schema', 'Radix', 'Base UI', 'React Aria']) {
			expect(UNUSED.test(`Works with ${name}.`), name).toBe(false);
		}
		expect(SHADCN.test('Run `pnpm dlx shadcn@latest add`.')).toBe(true);
		expect(SHADCN.test("import { Button } from '@/components/ui/button';")).toBe(true);
		expect(SHADCN.test("import { Demo } from '@/components/form-example-demo';")).toBe(false);
	});
});

/** The tracked files of `src/public` that are not an asset or a favicon, and so may be generated docs text. */
const strays = (tracked: string[]) => tracked.filter((file) => !/^(assets|favicon)\//.test(file));

describe('the public folder', () => {
	test('holds only assets and favicons in git, so no generated docs text is served stale', () => {
		const tracked = execFileSync('git', ['ls-files', '-z', '--', '.'], {
			cwd: join(import.meta.dirname, '../src/public'),
			encoding: 'utf8',
		})
			.split('\0')
			.filter(Boolean);
		expect(tracked.length).toBeGreaterThan(0);
		expect(strays(tracked)).toEqual([]);
	});

	test('the check names a generated docs file that was committed', () => {
		expect(strays(['assets/fonts/a.woff2', 'favicon/icon.svg'])).toEqual([]);
		expect(strays(['llms-content/forms/overview.md', 'llms.txt', 'skill/SKILL.md'])).toEqual([
			'llms-content/forms/overview.md',
			'llms.txt',
			'skill/SKILL.md',
		]);
	});
});
