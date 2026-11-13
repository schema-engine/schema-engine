import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ContentScanner, compareEntriesByField } from '@ecopages/content-processor';
import { docsFrontmatterSchema, LLM_SECTION_ORDER, type DocsFrontmatter } from '../src/content/docs';
import { getDocsLlmUrl } from '../src/lib/docs/docs-llm-url';
import { absoluteUrl, configuredSiteOrigin, normalizeSiteOrigin } from '../src/lib/docs/site-meta';

const appRoot = join(import.meta.dirname, '..');
const publicRoot = join(appRoot, 'src/public');
const defaultContentRoot = join(appRoot, 'src/content/docs');

export type GenerateLlmDocsOptions = {
	contentRoot?: string;
	/**
	 * Site origin used in `llms.txt` links. Defaults to `configuredSiteOrigin()`.
	 */
	baseUrl?: string;
};

function formatSectionTitle(section: string): string {
	return section
		.split('-')
		.map((word) => {
			if (word === 'ssr' || word === 'jsx') return word.toUpperCase();
			return word.charAt(0).toUpperCase() + word.slice(1);
		})
		.join(' ');
}

function createScanner(contentRoot: string): ContentScanner<DocsFrontmatter> {
	return new ContentScanner({
		contentRoot,
		schema: docsFrontmatterSchema,
		orderBy: compareEntriesByField('order'),
	});
}

/**
 * Writes raw MDX bodies and `llms.txt` into the public directory for static serving.
 *
 * @remarks
 * - `llms.txt` is the discovery index; linked page bodies live under `llms-content/<slug>.txt`.
 * - Pages appear in sidebar order (frontmatter `order`) inside each section, and sections follow `LLM_SECTION_ORDER`.
 * - `llms-content/` is generator-owned: each successful run replaces that tree so deleted or `llms: false` pages are not left public.
 * - Output is staged in `.llms-content-staging/` and swapped in only after all writes succeed; a failed run leaves the previous exports intact and removes the staging tree.
 * - The origin is normalised so a trailing slash cannot produce `//` in index links.
 */
export async function generateLlmDocs(outputRoot = publicRoot, options: GenerateLlmDocsOptions = {}): Promise<void> {
	const scanner = createScanner(options.contentRoot ?? defaultContentRoot);
	const posts = await scanner.getManifest();
	const llmRoot = join(outputRoot, 'llms-content');
	const stagingRoot = join(outputRoot, '.llms-content-staging');
	const origin = normalizeSiteOrigin(options.baseUrl ?? configuredSiteOrigin());

	try {
		await rm(stagingRoot, { recursive: true, force: true });
		await mkdir(stagingRoot, { recursive: true });

		const lines: string[] = [
			'# Schema Engine Documentation',
			'> Build typed JSON-driven forms, React adapters, actions, and registries with Schema Engine.',
			`> Start at ${absoluteUrl('/skill.txt', origin)} or ${absoluteUrl('/skill/SKILL.md', origin)}`,
			'',
		];

		const sections = new Map<string, typeof posts>();
		for (const post of posts) {
			const sectionId = post.segments[0] ?? 'other';
			if (!sections.has(sectionId)) {
				sections.set(sectionId, []);
			}
			sections.get(sectionId)!.push(post);
		}

		const orderedSections = [
			...LLM_SECTION_ORDER.filter((section) => sections.has(section)),
			...Array.from(sections.keys())
				.filter((section) => !LLM_SECTION_ORDER.includes(section as (typeof LLM_SECTION_ORDER)[number]))
				.toSorted((a, b) => a.localeCompare(b)),
		];

		for (const sectionId of orderedSections) {
			const exported = (sections.get(sectionId) ?? []).filter((page) => page.llms !== false);
			if (exported.length === 0) {
				continue;
			}

			lines.push(`## ${formatSectionTitle(sectionId)}`);

			for (const page of exported) {
				const body = await scanner.getRawContent(page.slug);
				const outputPath = join(stagingRoot, `${page.slug}.txt`);
				await mkdir(dirname(outputPath), { recursive: true });
				await writeFile(outputPath, body, 'utf8');

				lines.push(`- [${page.title}](${absoluteUrl(getDocsLlmUrl(page.slug), origin)})`);
			}

			lines.push('');
		}

		await mkdir(outputRoot, { recursive: true });
		await writeFile(join(outputRoot, 'llms.txt'), lines.join('\n'), 'utf8');
		await rm(llmRoot, { recursive: true, force: true });
		await rename(stagingRoot, llmRoot);
	} finally {
		await rm(stagingRoot, { recursive: true, force: true });
	}
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
	await generateLlmDocs(publicRoot);
	console.log(`[llms.txt] Generated ${join(publicRoot, 'llms.txt')} and ${join(publicRoot, 'llms-content')}/`);
}
