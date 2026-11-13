import type { JsxRenderable } from '@ecopages/jsx';
import { entries } from 'ecopages:content/docs';
import { compareDocsEntries, DOCS_ROOT, DOCS_SECTION_CONFIG, DOCS_SECTION_ORDER } from '@/content/docs';

export type DocsNavItem = {
	title: string;
	description: string;
	href: string;
	section: string;
	slug: string;
};

export type DocsNavSection = {
	id: string;
	title: string;
	icon: JsxRenderable;
	items: DocsNavItem[];
};

export type DocsNav = {
	rootDir: string;
	sections: DocsNavSection[];
};

const itemsBySection = new Map<string, DocsNavItem[]>();

for (const entry of entries.toSorted(compareDocsEntries)) {
	const sectionId = entry.segments[0]!;
	const items = itemsBySection.get(sectionId) ?? [];

	items.push({
		title: entry.title,
		description: entry.description,
		href: `${DOCS_ROOT}/${entry.segments.join('/')}`,
		section: sectionId,
		slug: entry.slug,
	});
	itemsBySection.set(sectionId, items);
}

/**
 * Sidebar navigation: one section per first-level content folder, titled and ordered by `DOCS_SECTION_CONFIG`.
 *
 * @remarks
 * A folder missing from `DOCS_SECTION_ORDER` gets no sidebar section; `test/docs-sections.test.ts` fails on one.
 */
export const docsNav: DocsNav = {
	rootDir: DOCS_ROOT,
	sections: DOCS_SECTION_ORDER.flatMap((sectionId) => {
		const items = itemsBySection.get(sectionId);
		if (!items || items.length === 0) {
			return [];
		}

		const config = DOCS_SECTION_CONFIG[sectionId];

		return [{ id: sectionId, title: config.title, icon: config.icon, items }];
	}),
};

/** Every nav item in sidebar order, for previous and next links. */
export const docsNavItems: readonly DocsNavItem[] = docsNav.sections.flatMap((section) => section.items);
