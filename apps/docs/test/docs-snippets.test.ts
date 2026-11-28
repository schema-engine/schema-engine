import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import {
	checkPageSnippets,
	docsPageIds,
	isTypeScriptFence,
	parseCodeBlocks,
	readPage,
	titledFiles,
	type CodeBlock,
	type InstalledModules,
} from './snippet-harness';
import { INSTALLED_BARREL, readExamples } from './example-format';
import { guideHelpers } from './helper-files';

vi.setConfig({ testTimeout: 120_000 });

interface AllowedFence {
	page: string;
	/** The heading the fences sit under; every TypeScript fence under it on the page is allowed. */
	heading: string;
	reason: string;
}

const DECLARATION_REASON = 'Restates the package signatures and declarations it documents; they are not modules.';

/** The headings of a page whose fences restate declarations, each with the same reason. */
const declarations = (page: string, headings: string[]): AllowedFence[] =>
	headings.map((heading) => ({ page, heading, reason: DECLARATION_REASON }));

/**
 * Fences that are fragments on purpose. A fence that is not listed here must compile.
 *
 * @remarks
 * An entry names the heading its fences sit under, so a fence added under another heading has to compile and cannot
 * break silently. A page that restates declarations lists each heading of them.
 */
const ALLOWED_FENCES: AllowedFence[] = [
	{
		page: 'actions/concepts',
		heading: 'Context',
		reason: 'Shows the call the dispatcher makes inside itself, which is not a module.',
	},
	{
		page: 'forms-react/api-reference',
		heading: 'Engine factory',
		reason: "Imports the app's own list of widgets and its own recipe, which the page does not define.",
	},
	{
		page: 'forms-react/layouts',
		heading: 'Default shadcn registry recipes',
		reason: 'Imports the barrels the shadcn command copies into the app, which do not exist before it runs.',
	},
	{
		page: 'forms-react/getting-started',
		heading: 'Create the engine',
		reason: 'Imports the barrels that the shadcn command copies into the app, which do not exist before it runs.',
	},
	{
		page: 'registry/overview',
		heading: 'The registration types',
		reason: 'Restates the package declarations, with the Standard Schema import left out.',
	},
	{
		page: 'registry/overview',
		heading: 'What createRegistry guarantees',
		reason: 'The package signature, which a snippet cannot declare again.',
	},
	{
		page: 'layout/overview',
		heading: 'Escape hatches',
		reason: 'An object literal that shows the properties of a form, not a module.',
	},
	{
		page: 'forms-react/components',
		heading: '',
		reason: 'Imports the barrel the shadcn command copies into the app, which does not exist before it runs.',
	},
	{
		page: 'forms-react/components',
		heading: 'Own them',
		reason: 'Imports the barrel the shadcn command copies into the app, which does not exist before it runs.',
	},
	{
		page: 'forms-react/components',
		heading: 'See them',
		reason: 'Imports the barrel the shadcn command copies into the app, which does not exist before it runs.',
	},
	...declarations('actions/api-reference', [
		'parseActions',
		'ActionDispatcher',
		'ActionRegistration',
		'ActionDispatchInput',
		'ActionMetadata',
		'ActionDispatchResult',
		'ActionSequenceEntry, ParsedAction and ParsedActionSequence',
		'ActionHandler',
		'defineAction',
	]),
	...declarations('forms/api-reference', [
		'createFormEngine',
		'defineInput / defineStatic',
		'FormEngine',
		'RecipeRegistration',
	]),
	...declarations('registry/api-reference', [
		'createRegistry',
		'bindRegistry',
		'assertStandardSchema',
		'safeParseStandardSchema',
		'standardSchema',
		'safeParseNode',
		'safeParseTree',
		'exportTreeSchema',
		'formatIssuePath',
		'createMutableRegistry',
		'BaseRegistration',
		'ComponentRegistration',
		'ComponentMetadata',
		'Brand',
		'JSON Schema subpath',
		'YAML subpath',
	]),
];

/**
 * The files a page tells the reader to have, as `./<name>` modules.
 *
 * @remarks
 * `registrations` and `engine` are the Radiant setup of the Forms Radiant getting started page; the others are files
 * that a guide page imports without defining them. Helpers (`*.helper.ts` in the guide sources) are added to every
 * page by {@link appFor}.
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
	'react-quick-start.react.tsx': readFileSync(
		join(import.meta.dirname, '../src/lib/guide-sources/react-quick-start.react.tsx'),
		'utf8',
	),
	'react-widgets.react.tsx': readFileSync(
		join(import.meta.dirname, '../src/lib/guide-sources/react-widgets.react.tsx'),
		'utf8',
	),
};

/** The pages whose titled files a page imports without defining them: it continues from them. */
const CONTINUES: Record<string, string[]> = {
	'schema-engine/serialized-documents': ['schema-engine/quick-start'],
	'actions/sequences-and-cancellation': ['actions/overview'],
	'forms/constraints': ['forms/getting-started'],
	'forms/validation': ['forms/getting-started'],
	'forms/actions': ['forms/getting-started'],
	'forms/validation-custom': ['forms/getting-started'],
	'renderer-authors/runtime': ['renderer-authors/write-a-renderer'],
	'renderer-authors/state-container': ['renderer-authors/write-a-renderer'],
	'renderer-authors/native-validity': ['renderer-authors/write-a-renderer'],
};

/** The helpers of the example a page of Examples shows, which sit in the folder of the example. */
const EXAMPLE_HELPERS = Object.fromEntries(
	readExamples().map((example) => [
		`examples/${example.id}`,
		Object.fromEntries(example.helpers.map((helper) => [helper.name, helper.source])),
	]),
);

const appFor = (page: string): Record<string, string> => ({
	...APP,
	...guideHelpers(),
	...EXAMPLE_HELPERS[page],
	...Object.assign({}, ...(CONTINUES[page] ?? []).map(titledFiles)),
});

/** The pages whose files import the registration barrel of the installed shadcn registry, which the docs app stands in for. */
const installedFor = (page: string): InstalledModules =>
	page.startsWith('examples/') || page === 'forms-react/other-react-state'
		? { [INSTALLED_BARREL]: 'src/lib/installed-components/registrations.ts' }
		: {};

const isAllowed = (page: string, block: CodeBlock): boolean =>
	ALLOWED_FENCES.some((entry) => entry.page === page && entry.heading === block.heading);

describe('docs snippets', () => {
	test('the TypeScript fences of every docs page compile', () => {
		const failures = docsPageIds().flatMap((page) =>
			checkPageSnippets(
				page,
				readPage(page),
				appFor(page),
				(block) => isAllowed(page, block),
				installedFor(page),
			).map(
				(failure) =>
					`${failure.page}, fence ${failure.fence} under "${failure.heading}": ${failure.messages.join(' ')}`,
			),
		);
		expect(failures).toEqual([]);
	});

	test('every allowed fence exists on a page and would otherwise fail', () => {
		for (const entry of ALLOWED_FENCES) {
			expect(entry.reason.trim(), `${entry.page} under "${entry.heading}" needs a reason`).not.toBe('');
			expect(docsPageIds(), `${entry.page} is not a docs page`).toContain(entry.page);
			const fences = parseCodeBlocks(readPage(entry.page)).filter(
				(block) => isTypeScriptFence(block) && block.heading === entry.heading,
			);
			expect(fences.length, `${entry.page} has no TypeScript fence under "${entry.heading}"`).toBeGreaterThan(0);
			const failures = checkPageSnippets(
				entry.page,
				readPage(entry.page),
				appFor(entry.page),
				undefined,
				installedFor(entry.page),
			).filter((failure) => failure.heading === entry.heading);
			expect(
				failures.length,
				`${entry.page} under "${entry.heading}" compiles; drop it from the list`,
			).toBeGreaterThan(0);
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
					fenceOf('ts', 'export const registry = new PluginRegistry();'),
				),
				{},
			);
			expect(failures).toHaveLength(1);
			expect(failures[0]).toMatchObject({ page: 'demo/page', fence: 2, heading: 'Setup' });
			expect(failures[0]!.messages[0]).toContain("Cannot find name 'PluginRegistry'");
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

		test('takes a title ending in .react.tsx as React JSX, which has no class attribute, and any other titled tsx file as Ecopages JSX', () => {
			const code = 'export const view = <p class="a" />;';
			const titled = (name: string) => `\`\`\`tsx title="${name}"\n${code}\n\`\`\``;
			expect(checkPageSnippets('demo/page', text(titled('view.tsx')), {})).toEqual([]);
			expect(checkPageSnippets('demo/page', text(titled('view.react.tsx')), {})).toHaveLength(1);
		});

		test('fails JSX under a ts tag and accepts it under tsx', () => {
			const code = 'export const view = <div />;';
			expect(checkPageSnippets('demo/page', text(fenceOf('ts', code)), {})).toHaveLength(1);
			expect(checkPageSnippets('demo/page', text(fenceOf('tsx', code)), {})).toEqual([]);
		});
	});
});
