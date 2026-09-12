import { join } from 'node:path';
import { fileSystem } from '@ecopages/file-system';
import { ContentScanner } from '@ecopages/content-processor';
import { mergeDocsPages, type DocsPageEntry } from './explicit-docs-pages';

export type LlmDocsOptions = {
	/** Directory where each document's raw content is written. */
	outputDir: string;
	pages?: readonly DocsPageEntry[];
	getPageContent?: (post: DocsPageEntry) => Promise<string>;
	/** Path of the generated `llms.txt` index file. */
	indexPath: string;
	/** Base URL used for links in the index. */
	baseUrl: string;
	/** Public sub-path used in index links. Defaults to `llms-content`. */
	publicPath?: string;
	/** Preferred section order; remaining sections are appended, sorted. */
	sectionOrder?: readonly string[];
	/** Header lines written at the top of the index file. */
	headerLines?: readonly string[];
	/** Computes the section key for a post. Defaults to the first slug segment. */
	getSection?: (post: DocsPageEntry) => string;
	/** Formats a section key into a display title. */
	formatSectionTitle?: (section: string) => string;
};

function defaultFormatTitle(value: string): string {
	return value
		.split('-')
		.map((word) => {
			if (word === 'ssr' || word === 'jsx') return word.toUpperCase();
			return word.charAt(0).toUpperCase() + word.slice(1);
		})
		.join(' ');
}

/** Generates an `llms.txt` index and per-document text files from scanned content. */
export async function generateLlmDocs<T extends Record<string, unknown> & { title: string; description: string }>(
	scanner: ContentScanner<T>,
	options: LlmDocsOptions,
): Promise<void> {
	const {
		outputDir,
		pages = [],
		getPageContent,
		indexPath,
		baseUrl,
		publicPath = 'llms-content',
		sectionOrder = [],
		headerLines = [],
		getSection = (post) => post.segments[0] ?? 'other',
		formatSectionTitle = defaultFormatTitle,
	} = options;

	const posts = mergeDocsPages(await scanner.getManifest(), pages);
	const pageSlugs = new Set(pages.map((page) => page.slug));
	async function getRawContent(post: DocsPageEntry): Promise<string> {
		if (!pageSlugs.has(post.slug)) return scanner.getRawContent(post.slug);
		if (!getPageContent) throw new Error('Explicit docs pages require a content loader');
		return getPageContent(post);
	}

	const sections = new Map<string, DocsPageEntry[]>();
	for (const post of posts) {
		const section = getSection(post);
		if (!sections.has(section)) sections.set(section, []);
		sections.get(section)!.push(post);
	}

	const orderedSections = [
		...sectionOrder.filter((section) => sections.has(section)),
		...Array.from(sections.keys())
			.filter((section) => !sectionOrder.includes(section))
			.toSorted((a, b) => a.localeCompare(b)),
	];

	const outputLines = [...headerLines];

	await fileSystem.ensureDirAsync(outputDir);
	await fileSystem.emptyDirAsync(outputDir);

	for (const section of orderedSections) {
		const sectionPosts = sections.get(section);
		if (!sectionPosts || sectionPosts.length === 0) continue;

		outputLines.push(`## ${formatSectionTitle(section)}`);

		for (const post of sectionPosts.toSorted((a, b) => a.slug.localeCompare(b.slug))) {
			const destFile = join(outputDir, `${post.slug}.txt`);
			const raw = await getRawContent(post);
			await fileSystem.writeAsync(destFile, raw);

			outputLines.push(`- [${post.title}](${baseUrl}/${publicPath}/${post.slug}.txt)`);
		}

		outputLines.push('');
	}

	await fileSystem.writeAsync(indexPath, outputLines.join('\n'));
}
