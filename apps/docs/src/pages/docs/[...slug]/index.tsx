import { eco, mergePageDependencies } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { entries, getEntryBySegments } from 'ecopages:content/docs';
import { getComponent, getEntryDependencies } from 'ecopages:content/docs/server';
import type { Entry } from 'ecopages:content/docs';
import { CopyForLlm } from '@/components/copy-for-llm';
import { DocsBreadcrumb } from '@/components/docs-breadcrumb';
import { DOCS_ROOT } from '@/content/docs';
import { getDocsLlmUrl } from '@/lib/docs/docs-llm-url';
import { DocsLayout } from '@/layouts/docs-layout';
import { ReactFormDemoEmbed } from '@/components/react-form-demo/react-form-demo-embed';
import { ReactFormPreview } from '@/components/react-form-demo/react-form-preview.react';

/** Sections whose pages embed React live demos. */
const REACT_DEMO_SECTIONS = ['forms-react/', 'styling/'];

/**
 * Single pages outside those sections that embed React live demos.
 *
 * @remarks
 * `shadcn` marks a page that renders the copied registry source: only those pages load its engine
 * code and stylesheets.
 */
const REACT_DEMO_PAGES: Record<string, { shadcn: boolean }> = {
	'examples/react-forms': { shadcn: true },
};

/**
 * @remarks
 * Imported on demand: a static import here would let the page collect the engine's stylesheets for
 * every route, and the docs build then ships them on pages that never show the shadcn example.
 */
async function loadShadcnDemoEmbed() {
	return (await import('@/components/react-form-demo/shadcn-form-demo-embed')).ShadcnFormDemoEmbed;
}

/**
 * @remarks
 * MDX entries only contribute their own module identity to
 * `getEntryDependencies`. Embedded React islands (`EcoEmbed` of
 * `ReactFormPreview`) must be merged explicitly or the page browser graph
 * ships SSR markup without hydration chunks.
 */
async function resolveDocsEntryDependencies(slug: string) {
	const entryDependencies = await getEntryDependencies(slug);
	const page = REACT_DEMO_PAGES[slug];
	if (!page && !REACT_DEMO_SECTIONS.some((section) => slug.startsWith(section))) {
		return entryDependencies;
	}
	return mergePageDependencies(entryDependencies, {
		components: [ReactFormDemoEmbed, ReactFormPreview, ...(page?.shadcn ? [await loadShadcnDemoEmbed()] : [])],
	});
}

/**
 * @remarks
 * Returns `undefined` for an empty slug so the layout renders no pagination
 * instead of matching a `/docs/` href that no nav item has.
 */
function docsHref(slug: string | string[] | undefined): string | undefined {
	const segments = [slug ?? []].flat().filter(Boolean);
	return segments.length > 0 ? `${DOCS_ROOT}/${segments.join('/')}` : undefined;
}

export default eco.page<{ entry: Entry }, JsxRenderable>({
	layout: {
		component: DocsLayout,
		props: ({ params }) => ({ currentHref: docsHref(params?.slug) }),
	},
	/**
	 * @remarks MDX entry assets still flow through `getEntryDependencies`; the
	 * page's own components are picked up from the static imports above.
	 */
	dependencies: async ({ props }) => resolveDocsEntryDependencies(props.entry.slug),
	staticPaths: async () => ({
		paths: entries.map((post) => ({
			params: {
				slug: post.segments,
			},
		})),
	}),
	staticProps: async ({ pathname }) => {
		const segments = Array.isArray(pathname.params.slug) ? pathname.params.slug : [pathname.params.slug];
		const entry = getEntryBySegments(segments);

		return {
			props: {
				entry,
			},
		};
	},
	metadata: ({ props: { entry } }) => ({
		title: `Docs | ${entry.title}`,
		description: entry.description,
		url: `${DOCS_ROOT}/${entry.segments.join('/')}`,
	}),
	render: async ({ entry }) => {
		const Content = await getComponent(entry.slug);

		return (
			<section class="docs-page">
				<div class="docs-bar unstyled">
					<DocsBreadcrumb entry={entry} />
					<CopyForLlm
						llmUrl={getDocsLlmUrl(entry.segments[0]!, entry.segments[entry.segments.length - 1]!)}
					/>
				</div>
				<Content />
			</section>
		);
	},
});
