import { readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { describe, expect, test } from 'vitest';
import { DOCS_ROOT, isDocsSectionId } from '../src/content/docs';

const contentRoot = join(import.meta.dirname, '../src/content/docs');

async function contentPagePaths(): Promise<string[]> {
	const files = await readdir(contentRoot, { recursive: true });
	return files
		.filter((file) => file.endsWith('.mdx'))
		.map(
			(file) =>
				`${DOCS_ROOT}/${file
					.split(sep)
					.join('/')
					.replace(/\.mdx$/, '')}`,
		)
		.toSorted();
}

/** The pages that are outside a configured section, or not exactly one folder below it. */
function misplacedPages(paths: string[]): string[] {
	return paths.filter((path) => {
		const [, , section, ...rest] = path.split('/');
		return !isDocsSectionId(section ?? '') || rest.length !== 1;
	});
}

describe('docs sections', () => {
	test('every page lives in a configured section folder, one level deep', async () => {
		expect(misplacedPages(await contentPagePaths())).toEqual([]);
	});

	test('a page outside a configured section, or deeper than one level, is misplaced', () => {
		expect(misplacedPages(['/docs/forms/overview', '/docs/schema-engine/introduction'])).toEqual([]);
		expect(misplacedPages(['/docs/unlisted/overview'])).toEqual(['/docs/unlisted/overview']);
		expect(misplacedPages(['/docs/forms/deep/overview'])).toEqual(['/docs/forms/deep/overview']);
		expect(misplacedPages(['/docs/forms'])).toEqual(['/docs/forms']);
	});
});
