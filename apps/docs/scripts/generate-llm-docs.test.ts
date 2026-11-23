import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path, { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { getDocsLlmUrlFromPathname } from '../src/lib/docs/docs-llm-url';
import { DOCS_SITEMAP_EXTRA_URLS, docsPageHeadLinks } from '../src/lib/docs/site-meta';

const appRoot = path.resolve(import.meta.dirname, '..');
const sourceContentRoot = join(appRoot, 'src/content/docs');
const publicRoot = join(appRoot, 'src/public');

let contentRoot = '';

beforeAll(async () => {
	contentRoot = await mkdtemp(join(tmpdir(), 'schema-engine-llm-content-'));
	const schemaEngineDir = join(contentRoot, 'schema-engine');
	const llmsFixtureDir = join(contentRoot, 'llms-fixture');
	await mkdir(schemaEngineDir, { recursive: true });
	await mkdir(llmsFixtureDir, { recursive: true });
	await copyFile(
		join(sourceContentRoot, 'schema-engine/introduction.mdx'),
		join(schemaEngineDir, 'introduction.mdx'),
	);
	await copyFile(join(sourceContentRoot, 'schema-engine/packages.mdx'), join(schemaEngineDir, 'packages.mdx'));
	await writeFile(
		join(llmsFixtureDir, 'excluded.mdx'),
		`---
title: "Excluded"
description: "Excluded from LLM exports."
order: 1
llms: false
---

# Excluded from LLM export
`,
		'utf8',
	);
});

afterAll(async () => {
	if (contentRoot) {
		await rm(contentRoot, { recursive: true, force: true });
	}
});

function page(title: string, order: number): string {
	return `---\ntitle: "${title}"\ndescription: "${title}."\norder: ${order}\n---\n\n# ${title}\n`;
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

test('generateLlmDocs writes llms.txt and markdown exports', async () => {
	const outputRoot = await mkdtemp(join(tmpdir(), 'schema-engine-llm-output-'));

	try {
		const { generateLlmDocs } = await import('./generate-llm-docs');
		await generateLlmDocs(outputRoot, { contentRoot });

		const llmsTxt = await readFile(join(outputRoot, 'llms.txt'), 'utf8');
		expect(llmsTxt).toContain('# Schema Engine Documentation');
		expect(llmsTxt).toContain('## Schema Engine');
		expect(llmsTxt).toContain('/docs-llm/schema-engine/introduction.md');
		expect(llmsTxt).not.toContain('Excluded');
		expect(llmsTxt).not.toContain('## Llms Fixture');

		const introduction = await readFile(join(outputRoot, 'docs-llm/schema-engine/introduction.md'), 'utf8');
		expect(introduction).toContain('title:');
		expect(await pathExists(join(outputRoot, 'docs-llm/llms-fixture/excluded.md'))).toBe(false);
	} finally {
		await rm(outputRoot, { recursive: true, force: true });
	}
});

test('generateLlmDocs leaves no staging directory behind', async () => {
	const outputRoot = await mkdtemp(join(tmpdir(), 'schema-engine-llm-staging-cleanup-'));

	try {
		const { generateLlmDocs } = await import('./generate-llm-docs');
		await generateLlmDocs(outputRoot, { contentRoot });

		expect(await pathExists(join(outputRoot, '.docs-llm-staging'))).toBe(false);
	} finally {
		await rm(outputRoot, { recursive: true, force: true });
	}
});

test('generateLlmDocs replaces stale generator-owned exports', async () => {
	const outputRoot = await mkdtemp(join(tmpdir(), 'schema-engine-llm-stale-'));

	try {
		await mkdir(join(outputRoot, 'docs-llm/stale-section'), { recursive: true });
		await writeFile(join(outputRoot, 'docs-llm/stale-section/gone.md'), '# Obsolete export\n', 'utf8');

		const { generateLlmDocs } = await import('./generate-llm-docs');
		await generateLlmDocs(outputRoot, { contentRoot });

		expect(await pathExists(join(outputRoot, 'docs-llm/stale-section/gone.md'))).toBe(false);
		expect(await pathExists(join(outputRoot, 'docs-llm/schema-engine/introduction.md'))).toBe(true);
	} finally {
		await rm(outputRoot, { recursive: true, force: true });
	}
});

test('generateLlmDocs index links, HTML alternates, and sitemap extras stay consistent', async () => {
	const outputRoot = await mkdtemp(join(tmpdir(), 'schema-engine-llm-contract-'));
	const origin = 'https://docs.example.com/';

	try {
		const { generateLlmDocs } = await import('./generate-llm-docs');
		await generateLlmDocs(outputRoot, { contentRoot, baseUrl: origin });

		const llmsTxt = await readFile(join(outputRoot, 'llms.txt'), 'utf8');
		expect(llmsTxt).not.toContain('https://docs.example.com//');

		const pageLinks = [...llmsTxt.matchAll(/\]\((https?:\/\/[^)]+\/docs-llm\/[^)]+)\)/g)].map((match) => match[1]);
		expect(pageLinks.length).toBeGreaterThan(0);

		for (const href of pageLinks) {
			const url = new URL(href);
			expect(url.origin).toBe('https://docs.example.com');
			expect(await pathExists(join(outputRoot, url.pathname.slice(1)))).toBe(true);

			const slug = url.pathname.replace(/^\/docs-llm\//, '').replace(/\.md$/, '');
			expect(slug).not.toBe('');
			expect(getDocsLlmUrlFromPathname(`/docs/${slug}`)).toBe(url.pathname);
			expect(docsPageHeadLinks(`/docs/${slug}`, origin).markdownAlternate).toBe(href);
			expect(docsPageHeadLinks(`/docs/${slug}`, origin).canonical).toBe(`https://docs.example.com/docs/${slug}`);
		}

		for (const extraUrl of DOCS_SITEMAP_EXTRA_URLS) {
			const relativePath = extraUrl.replace(/^\//, '');
			const generatedPath = join(outputRoot, relativePath);
			const staticPath = join(publicRoot, relativePath);
			expect((await pathExists(generatedPath)) || (await pathExists(staticPath))).toBe(true);
		}
	} finally {
		await rm(outputRoot, { recursive: true, force: true });
	}
});

test('generateLlmDocs lists pages in frontmatter order, not slug order', async () => {
	const outputRoot = await mkdtemp(join(tmpdir(), 'schema-engine-llm-order-'));
	const orderRoot = await mkdtemp(join(tmpdir(), 'schema-engine-llm-order-content-'));

	try {
		await mkdir(join(orderRoot, 'forms'), { recursive: true });
		await writeFile(join(orderRoot, 'forms/alpha.mdx'), page('Alpha page', 2), 'utf8');
		await writeFile(join(orderRoot, 'forms/zulu.mdx'), page('Zulu page', 1), 'utf8');

		const { generateLlmDocs } = await import('./generate-llm-docs');
		await generateLlmDocs(outputRoot, { contentRoot: orderRoot });

		const llmsTxt = await readFile(join(outputRoot, 'llms.txt'), 'utf8');
		expect(llmsTxt.indexOf('Zulu page')).toBeGreaterThan(-1);
		expect(llmsTxt.indexOf('Zulu page')).toBeLessThan(llmsTxt.indexOf('Alpha page'));
	} finally {
		await rm(outputRoot, { recursive: true, force: true });
		await rm(orderRoot, { recursive: true, force: true });
	}
});

test('generateLlmDocs lists sections in the configured order, not alphabetical order', async () => {
	const outputRoot = await mkdtemp(join(tmpdir(), 'schema-engine-llm-section-order-'));
	const orderRoot = await mkdtemp(join(tmpdir(), 'schema-engine-llm-section-order-content-'));

	try {
		for (const section of ['examples', 'forms', 'actions', 'registry', 'schema-engine']) {
			await mkdir(join(orderRoot, section), { recursive: true });
			await writeFile(join(orderRoot, section, 'page.mdx'), page(`${section} page`, 1), 'utf8');
		}

		const { generateLlmDocs } = await import('./generate-llm-docs');
		await generateLlmDocs(outputRoot, { contentRoot: orderRoot });

		const llmsTxt = await readFile(join(outputRoot, 'llms.txt'), 'utf8');
		const headings = [...llmsTxt.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
		expect(headings).toEqual(['How to read the docs', 'Schema Engine', 'Registry', 'Actions', 'Forms', 'Examples']);
	} finally {
		await rm(outputRoot, { recursive: true, force: true });
		await rm(orderRoot, { recursive: true, force: true });
	}
});

test('generateLlmDocs omits the header of a section whose pages are all excluded', async () => {
	const outputRoot = await mkdtemp(join(tmpdir(), 'schema-engine-llm-empty-section-'));

	try {
		const { generateLlmDocs } = await import('./generate-llm-docs');
		await generateLlmDocs(outputRoot, { contentRoot });

		const llmsTxt = await readFile(join(outputRoot, 'llms.txt'), 'utf8');
		expect(llmsTxt).not.toContain('Llms Fixture');
	} finally {
		await rm(outputRoot, { recursive: true, force: true });
	}
});
