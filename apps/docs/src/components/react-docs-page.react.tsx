/** @jsxImportSource react */
import { eco } from '@ecopages/core';
import { EcoEmbed } from '@ecopages/react/eco-embed';
import type { ReactNode } from 'react';
import { CopyForLlm } from '@/components/copy-for-llm';
import { DocsBreadcrumb } from '@/components/docs-breadcrumb';
import type { DocsPageEntry } from '@/lib/explicit-docs-pages';

export const ReactDocsPage = eco.component<{ entry: DocsPageEntry; children: ReactNode }, ReactNode>({
	dependencies: { components: [CopyForLlm, DocsBreadcrumb] },
	render: ({ entry, children }) => (
		<section className="docs-page">
			<div className="docs-bar unstyled">
				<EcoEmbed component={DocsBreadcrumb} props={{ entry }} />
				<EcoEmbed component={CopyForLlm} props={{ llmUrl: `/llms-content/${entry.slug}.txt` }} />
			</div>
			{children}
		</section>
	),
});
