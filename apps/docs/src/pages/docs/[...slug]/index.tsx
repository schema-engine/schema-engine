import { eco, mergePageDependencies } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { entries, getEntryBySegments } from 'ecopages:content/docs';
import { getComponent, getEntryDependencies } from 'ecopages:content/docs/server';
import type { Entry } from 'ecopages:content/docs';
import { CopyForLlm } from '@/components/copy-for-llm';
import { DocsBreadcrumb } from '@/components/docs-breadcrumb';
import { DocsLayout } from '@/layouts/docs-layout';
import { ReactFormDemoEmbed } from '@/components/react-form-demo/react-form-demo-embed';
import { ReactFormPreview } from '@/components/react-form-demo/react-form-preview.react';

/**
 * @remarks
 * MDX entries only contribute their own module identity to
 * `getEntryDependencies`. Embedded React islands (`EcoEmbed` of
 * `ReactFormPreview`) must be merged explicitly or the page browser graph
 * ships SSR markup without hydration chunks.
 */
async function resolveDocsEntryDependencies(slug: string) {
	const entryDependencies = await getEntryDependencies(slug);
	if (!slug.startsWith('forms-react/')) {
		return entryDependencies;
	}
	return mergePageDependencies(entryDependencies, {
		components: [ReactFormDemoEmbed, ReactFormPreview],
	});
}

export default eco.page<{ entry: Entry }, JsxRenderable>({
	layout: DocsLayout,
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
	}),
	render: async ({ entry }) => {
		const Content = await getComponent(entry.slug);

		return (
			<section class="docs-page">
				<div class="docs-bar unstyled">
					<DocsBreadcrumb entry={entry} />
					<CopyForLlm llmUrl={`/llms-content/${entry.slug}.txt`} />
				</div>
				<Content />
			</section>
		);
	},
});
