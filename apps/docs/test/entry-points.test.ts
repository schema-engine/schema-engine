import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { DOCS_SECTION_CONFIG, DOCS_SECTION_ORDER } from '../src/content/docs';
import { DEFAULT_SITE_ORIGIN } from '../src/lib/docs/site-meta';
import { generateLlmDocs } from '../scripts/generate-llm-docs';
import { docsPageIds, docsRoot } from './snippet-harness';

const repository = join(import.meta.dirname, '../../..');
const read = (file: string) => readFileSync(join(repository, file), 'utf8');

const homepage = read('apps/docs/src/pages/index.tsx');
const packageNames = readdirSync(join(repository, 'packages'));
const readmes = ['README.md', ...packageNames.map((name) => `packages/${name}/README.md`)];
const pages = new Set(docsPageIds());

/** The docs pages a text links to with a `/docs/...` path, without the fragment. */
const docsLinks = (text: string) =>
	[...text.matchAll(/['"(`](\/docs\/[a-z0-9/-]+)(?:#[a-z0-9-]*)?['")`]/g)].map((match) => match[1]!);

/** The relative file links of a Markdown file, without the fragment. */
const fileLinks = (text: string) =>
	[...text.matchAll(/\]\((\.{1,2}\/[^)#\s]+)(?:#[^)\s]*)?\)/g)].map((match) => match[1]!);

describe('the homepage', () => {
	test('every docs link opens a page that exists', () => {
		const links = docsLinks(homepage);
		expect(links.length).toBeGreaterThan(10);
		const missing = links.filter((link) => !pages.has(link.replace('/docs/', '')));
		expect(missing).toEqual([]);
	});

	test('names every package of the repository, and no renderer that does not exist', () => {
		for (const name of packageNames) expect(homepage, name).toContain(`@schema-engine/${name}`);
		expect(homepage).not.toMatch(/\b(Vue|Svelte|Angular|Solid)\b|adapters coming soon|Zero Boilerplate/i);
	});

	test('npm column links every package', () => {
		for (const name of packageNames) {
			expect(homepage, name).toContain(`https://www.npmjs.com/package/@schema-engine/${name}`);
		}
	});

	test('its primary link opens the Schema Engine quick start', () => {
		expect(homepage).toMatch(/href="\/docs\/schema-engine\/quick-start"[^>]*size="lg"/);
	});
});

describe('the READMEs', () => {
	test.each(readmes)('%s links only to files that exist', (readme) => {
		const missing = fileLinks(read(readme)).filter(
			(link) => !existsSync(resolve(dirname(join(repository, readme)), link)),
		);
		expect(missing).toEqual([]);
	});

	test('the root README names every package of the repository, and no renderer that does not exist', () => {
		const root = read('README.md');
		for (const name of packageNames) expect(root, name).toContain(`@schema-engine/${name}`);
		expect(root).not.toMatch(/\b(Vue|Svelte|Angular|Solid)\b|\bCLI\b|IoC Container|Command Pattern/);
	});
});

describe('the READMEs and package manifests point at the hosted docs', () => {
	const hostedDocs = `${DEFAULT_SITE_ORIGIN}/docs/`;

	/** The hosted docs links of a text, as the page id each opens, without a fragment. */
	const hostedPages = (text: string) =>
		[...text.matchAll(new RegExp(`${hostedDocs.replaceAll('.', '\\.')}([a-z0-9/-]+)(?:#[a-z0-9-]*)?`, 'g'))].map(
			(match) => match[1]!,
		);

	test.each(readmes)('%s links no .mdx file and no path into the docs app or a source folder', (readme) => {
		const text = read(readme);
		expect(text).not.toMatch(/\.mdx\b/);
		expect(fileLinks(text).filter((link) => /apps\/docs|\/src\//.test(link))).toEqual([]);
	});

	test.each(readmes)('%s links the docs with absolute URLs of pages that exist', (readme) => {
		const text = read(readme);
		expect(text).not.toMatch(/\]\(\/docs\//);
		const links = hostedPages(text);
		expect(links.length).toBeGreaterThan(0);
		expect(links.filter((link) => !pages.has(link))).toEqual([]);
	});

	test.each(packageNames)('packages/%s/package.json has the overview of its docs section as homepage', (name) => {
		const manifest = JSON.parse(read(`packages/${name}/package.json`)) as { homepage?: string; private?: boolean };
		if (manifest.private) return;
		expect(manifest.homepage).toBe(`${hostedDocs}${name}/overview`);
		expect(pages.has(`${name}/overview`)).toBe(true);
	});
});

describe('the words', () => {
	const entryTexts: Array<[string, string]> = [
		['README.md', read('README.md')],
		['the homepage', homepage],
		...packageNames.map(
			(name) => [`packages/${name}/README.md`, read(`packages/${name}/README.md`)] as [string, string],
		),
		...[...pages].map((page) => [page, readFileSync(join(docsRoot, `${page}.mdx`), 'utf8')] as [string, string]),
	];

	test.each(entryTexts)('%s calls an action an action, never a plugin', (_name, text) => {
		const lines = text
			.split('\n')
			.filter((line) => /\bactions? plugins?\b|\bplugins? actions?\b|registered plugins\b/i.test(line));
		expect(lines).toEqual([]);
	});
});

describe('the llms exports', () => {
	test('llms.txt lists the sections in the order of the sidebar and describes the project as the README does', async () => {
		const output = await mkdtemp(join(tmpdir(), 'schema-engine-llms-'));
		try {
			await generateLlmDocs(output, { baseUrl: 'https://example.com' });
			const index = await readFile(join(output, 'llms.txt'), 'utf8');
			const sections = [...index.matchAll(/^## (.+)$/gm)]
				.map((match) => match[1]!)
				.filter((title) => title !== 'How to read the docs');
			expect(sections).toEqual(DOCS_SECTION_ORDER.map((section) => DOCS_SECTION_CONFIG[section].title));
			expect(index).toContain('A common language for describing interfaces and processes as JSON');
		} finally {
			await rm(output, { recursive: true, force: true });
		}
	});
});
