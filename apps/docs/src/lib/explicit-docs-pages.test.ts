import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ContentScanner } from '@ecopages/content-processor';
import { docsFrontmatterSchema } from '../content/docs';
import { generateLlmDocs } from './llm-docs';
import { buildGroupedNav, findAdjacentNavItems, flattenContentNav } from './content-nav';
import { explicitDocsPages, mergeDocsPages, type DocsPageEntry } from './explicit-docs-pages';

void test('explicit pages replace matching content metadata without duplicate navigation', () => {
	const page = explicitDocsPages[0]!;
	const content: DocsPageEntry[] = [
		{ ...page, title: 'Shadowed MDX title', order: 99 },
		{ ...page, slug: 'forms-react/overview', segments: ['forms-react', 'overview'], title: 'Overview', order: 1 },
		{
			...page,
			slug: 'forms-react/components',
			segments: ['forms-react', 'components'],
			title: 'Components',
			order: 3,
		},
	];
	const entries = mergeDocsPages(content, explicitDocsPages);
	assert.equal(entries.filter((entry) => entry.slug === page.slug).length, 1);
	assert.equal(entries.find((entry) => entry.slug === page.slug)?.title, page.title);
	const nav = flattenContentNav(buildGroupedNav(entries, { rootDir: '/docs' }));
	assert.deepEqual(
		nav.map((entry) => entry.title),
		['Overview', 'Getting Started', 'Components', 'View recipes'],
	);
	const adjacent = findAdjacentNavItems(nav, '/docs/forms-react/getting-started');
	assert.equal(adjacent?.prev?.title, 'Overview');
	assert.equal(adjacent?.next?.title, 'Components');
	assert.equal(content[0]?.title, 'Shadowed MDX title');
});

void test('LLM exports include page-only docs and prefer explicit text for collisions', async () => {
	const dir = await mkdtemp(join(tmpdir(), 'schema-docs-test-'));
	try {
		const contentRoot = join(dir, 'content');
		await mkdir(join(contentRoot, 'forms-react'), { recursive: true });
		await writeFile(
			join(contentRoot, 'forms-react/getting-started.mdx'),
			'---\ntitle: Shadowed\ndescription: Old description\n---\nOld content',
		);
		await writeFile(
			join(contentRoot, 'plain.mdx'),
			'---\ntitle: Plain\ndescription: Plain document\n---\nPlain content',
		);
		const scanner = new ContentScanner({ contentRoot, schema: docsFrontmatterSchema });
		await generateLlmDocs(scanner, {
			outputDir: join(dir, 'output'),
			indexPath: join(dir, 'llms.txt'),
			baseUrl: 'https://docs.example',
			pages: explicitDocsPages,
			getPageContent: async (post) => `Explicit: ${post.title}`,
		});
		assert.equal(
			await readFile(join(dir, 'output/forms-react/getting-started.txt'), 'utf8'),
			'Explicit: Getting Started',
		);
		assert.equal(await readFile(join(dir, 'output/forms-react/layouts.txt'), 'utf8'), 'Explicit: View recipes');
		assert.match(await readFile(join(dir, 'output/plain.txt'), 'utf8'), /Plain content/);
		const index = await readFile(join(dir, 'llms.txt'), 'utf8');
		assert.equal(index.split('forms-react/getting-started.txt').length - 1, 1);
		assert.doesNotMatch(index, /Shadowed/);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
