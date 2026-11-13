import { readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { describe, expect, test } from 'vitest';
import { DOCS_ROOT, isDocsSectionId } from '../src/content/docs';

const contentRoot = join(import.meta.dirname, '../src/content/docs');

/**
 * Docs URLs that are public today.
 *
 * @remarks
 * A page that moves or is removed breaks every link to it. Before deleting an entry here, serve a
 * redirect from the old URL; adding pages does not require touching this list.
 */
const PUBLISHED_DOCS_URLS = [
	'/docs/actions/advanced',
	'/docs/actions/api-reference',
	'/docs/actions/available-plugins',
	'/docs/actions/core-concepts',
	'/docs/actions/custom-plugins',
	'/docs/actions/getting-started',
	'/docs/actions/how-it-works',
	'/docs/actions/overview',
	'/docs/capabilities/overview',
	'/docs/examples/basic-form',
	'/docs/examples/contact-form',
	'/docs/examples/registration-flow',
	'/docs/examples/sequential-actions',
	'/docs/examples/survey-form',
	'/docs/forms-radiant/getting-started',
	'/docs/forms-radiant/layouts',
	'/docs/forms-radiant/overview',
	'/docs/forms-react/advanced',
	'/docs/forms-react/api-reference',
	'/docs/forms-react/components',
	'/docs/forms-react/getting-started',
	'/docs/forms-react/hooks',
	'/docs/forms-react/layouts',
	'/docs/forms-react/overview',
	'/docs/forms/actions',
	'/docs/forms/api-reference',
	'/docs/forms/builder',
	'/docs/forms/core-concepts',
	'/docs/forms/getting-started',
	'/docs/forms/overview',
	'/docs/forms/validation-built-in',
	'/docs/forms/validation-custom',
	'/docs/forms/validation-how-it-works',
	'/docs/forms/validation',
	'/docs/getting-started/installation',
	'/docs/getting-started/introduction',
	'/docs/getting-started/next-steps',
	'/docs/getting-started/quick-start',
	'/docs/registry/api-reference',
	'/docs/registry/core-concepts',
	'/docs/registry/examples',
	'/docs/registry/overview',
] as const;

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

describe('docs sections', () => {
	test('every page lives in a configured section folder, one level deep', async () => {
		for (const path of await contentPagePaths()) {
			const [, , section, ...rest] = path.split('/');
			expect(isDocsSectionId(section ?? ''), `${path} is not in DOCS_SECTION_CONFIG`).toBe(true);
			expect(rest, `${path} must be <section>/<page>`).toHaveLength(1);
		}
	});

	test('every published docs URL still has a page', async () => {
		const pages = new Set(await contentPagePaths());
		const missing = PUBLISHED_DOCS_URLS.filter((url) => !pages.has(url));
		expect(missing).toEqual([]);
	});
});
