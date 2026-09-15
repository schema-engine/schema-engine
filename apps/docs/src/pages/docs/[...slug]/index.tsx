import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { entries, getEntryBySegments } from 'ecopages:content/docs';
import { getComponent, getEntryDependencies } from 'ecopages:content/docs/server';
import type { Entry } from 'ecopages:content/docs';
import { CopyForLlm } from '@/components/copy-for-llm';
import { DocsBreadcrumb } from '@/components/docs-breadcrumb';
import { DocsLayout } from '@/layouts/docs-layout';

export default eco.page<{ entry: Entry }, JsxRenderable>({
	layout: DocsLayout,
	/**
	 * @remarks MDX entry assets still flow through `getEntryDependencies`; the
	 * page's own components are picked up from the static imports above.
	 */
	dependencies: async ({ props }) => getEntryDependencies(props.entry.slug),
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
