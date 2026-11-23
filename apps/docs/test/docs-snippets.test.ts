import { describe, expect, test, vi } from 'vitest';
import { allRecipes, recipeConfigSource } from '../src/lib/recipes/catalog';
import {
	checkPageSnippets,
	docsPageIds,
	isTypeScriptFence,
	parseCodeBlocks,
	readPage,
	type CodeBlock,
} from './snippet-harness';

vi.setConfig({ testTimeout: 60_000 });

/**
 * The docs whose `ts` and `tsx` fences must compile: a section id, or one page as `<section>/<page>`.
 *
 * @remarks
 * A section is turned on when its pages are rewritten, by replacing its page entries with the section id. A
 * section that still holds fences that cannot compile stays off, or lists the pages that are ready, so the list
 * is never left failing.
 */
const CHECKED_DOCS = ['layout', 'registry/registries', 'schema-engine'];

interface AllowedFence {
	page: string;
	/** The heading the fence sits under; every TypeScript fence under it on the page is allowed. */
	heading: string;
	reason: string;
}

/** Fences that are fragments on purpose. A fence that is not listed here must compile. */
const ALLOWED_FENCES: AllowedFence[] = [
	{
		page: 'layout/overview',
		heading: 'Escape hatches',
		reason: 'An object literal that shows the properties of a form, not a module.',
	},
];

const recipeFiles = Object.fromEntries(
	allRecipes.flatMap((recipe) =>
		recipe.files.filter((file) => file.lang !== 'css').map((file) => [file.label, file.source] as const),
	),
);

/**
 * The files a page tells the reader to have, as `./<name>` modules.
 *
 * @remarks
 * `registrations` and `engine` are the Radiant setup of the Forms Radiant getting started page; the rest are the
 * recipe tabs the layout recipes page asks the reader to copy.
 */
const APP: Record<string, string> = {
	'registrations.ts': "export { schemaFormRegistrations as elements } from '@schema-engine/forms-radiant';",
	'engine.ts': `import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
export const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });`,
	'postal-code.ts': `import * as z from 'zod/mini';
export const postalCode = {
	$type: 'postalCode',
	schema: z.object({ type: z.literal('postalCode'), message: z.optional(z.string()) }),
	metadata: { name: 'Postal code' },
	category: 'string',
	handler: () => z.string(),
} as const;`,
	'contact-card.ts': recipeConfigSource(allRecipes.find((recipe) => recipe.id === 'contact-card')!.demos),
	'brand-frame.ts': "export { BrandFrameRecipe } from './brand-frame.radiant';",
	...recipeFiles,
};

const isChecked = (page: string): boolean =>
	CHECKED_DOCS.some((entry) => page === entry || page.startsWith(`${entry}/`));

const isAllowed = (page: string, block: CodeBlock): boolean =>
	ALLOWED_FENCES.some((entry) => entry.page === page && entry.heading === block.heading);

describe('docs snippets', () => {
	test('every checked entry is a docs section or a page', () => {
		const pages = docsPageIds();
		for (const entry of CHECKED_DOCS) {
			expect(
				pages.some((page) => page === entry || page.startsWith(`${entry}/`)),
				`${entry} is not a docs section or page`,
			).toBe(true);
		}
	});

	test('the TypeScript fences of the checked docs compile', () => {
		const failures = docsPageIds()
			.filter(isChecked)
			.flatMap((page) =>
				checkPageSnippets(page, readPage(page), APP, (block) => isAllowed(page, block)).map(
					(failure) =>
						`${failure.page}, fence ${failure.fence} under "${failure.heading}": ${failure.messages.join(' ')}`,
				),
			);
		expect(failures).toEqual([]);
	});

	test('every allowed fence exists in a checked page and would otherwise fail', () => {
		for (const entry of ALLOWED_FENCES) {
			expect(entry.reason.trim(), `${entry.page} under "${entry.heading}" needs a reason`).not.toBe('');
			expect(isChecked(entry.page), `${entry.page} is not a checked page`).toBe(true);
			const fences = parseCodeBlocks(readPage(entry.page)).filter(
				(block) => isTypeScriptFence(block) && block.heading === entry.heading,
			);
			expect(fences.length, `${entry.page} has no TypeScript fence under "${entry.heading}"`).toBeGreaterThan(0);
			const failures = checkPageSnippets(entry.page, readPage(entry.page), APP).filter(
				(failure) => failure.heading === entry.heading,
			);
			expect(failures.length, `${entry.page} under "${entry.heading}" compiles; drop it from the list`).toBe(
				fences.length,
			);
		}
	});

	describe('the checker', () => {
		const fenceOf = (lang: string, code: string) => `\`\`\`${lang}\n${code}\n\`\`\``;
		const text = (...fences: string[]) => `# Page\n\n## Setup\n\n${fences.join('\n\n')}\n`;

		test('names the page and the fence of an identifier the snippet never imports', () => {
			const failures = checkPageSnippets(
				'demo/page',
				text(
					fenceOf('ts', 'export const a = 1;'),
					fenceOf('ts', 'export const registry = new BaseRegistry();'),
				),
				{},
			);
			expect(failures).toHaveLength(1);
			expect(failures[0]).toMatchObject({ page: 'demo/page', fence: 2, heading: 'Setup' });
			expect(failures[0]!.messages[0]).toContain("Cannot find name 'BaseRegistry'");
		});

		test('leaves a fence the caller skips, and fences that declare the same name do not collide', () => {
			const same = fenceOf('ts', 'const value = 1;');
			expect(checkPageSnippets('demo/page', text(same, same), {})).toEqual([]);
			const broken = fenceOf('ts', 'const n: number = "a";');
			expect(checkPageSnippets('demo/page', text(broken), {}, () => true)).toEqual([]);
			expect(checkPageSnippets('demo/page', text(broken), {})).toHaveLength(1);
		});

		test('resolves the files of the app and the titled fences of the page', () => {
			const titled = '```ts title="theme.ts"\nexport const theme = 1;\n```';
			const user = fenceOf(
				'ts',
				"import { theme } from './theme';\nimport { x } from './app';\nexport const y = theme + x;",
			);
			expect(checkPageSnippets('demo/page', text(titled, user), { 'app.ts': 'export const x = 2;' })).toEqual([]);
		});

		test('fails JSX under a ts tag and accepts it under tsx', () => {
			const code = 'export const view = <div />;';
			expect(checkPageSnippets('demo/page', text(fenceOf('ts', code)), {})).toHaveLength(1);
			expect(checkPageSnippets('demo/page', text(fenceOf('tsx', code)), {})).toEqual([]);
		});
	});
});
