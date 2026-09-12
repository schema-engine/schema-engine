import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { entries, getEntryBySegments } from 'ecopages:content/docs';
import { getComponent, getEntryDependencies } from 'ecopages:content/docs/server';
import type { Entry } from 'ecopages:content/docs';
import { CopyForLlm } from '@/components/copy-for-llm';
import { DocsBreadcrumb } from '@/components/docs-breadcrumb';
import { DocsLayout } from '@/layouts/docs-layout';
import { explicitDocsPages } from '@/lib/explicit-docs-pages';

export default eco.page<{ entry: Entry }, JsxRenderable>({
	layout: DocsLayout,
	dependencies: async ({ props }) => {
		const entryDependencies = await getEntryDependencies(props.entry.slug);
		return {
			...entryDependencies,
			components: [...(entryDependencies?.components ?? []), CopyForLlm, DocsBreadcrumb],
		};
	},
	staticPaths: async () => ({
		paths: entries
			.filter((post) => !explicitDocsPages.some((page) => page.slug === post.slug))
			.map((post) => ({
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
