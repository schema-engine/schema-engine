import type { LayoutProps } from '@ecopages/core';
import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import '@/docs-kit.instance';
import { DocsBar } from '@/docs-kit/components/docs-bar';
import { getDocsKit } from '@/docs-kit/config';
import { getDocsLlmUrl } from '@/docs-kit/llm/docs-llm-url';
import { projectDocsManifest } from '@/docs-kit/manifest/project-docs-manifest';
import { resolveDocsBreadcrumb } from '@/docs-kit/navigation/resolve-docs-breadcrumb';
import { serializeDocsManifestData } from '@/docs-kit/manifest/serialize-docs-manifest';
import { DocsPagination } from './docs-layout/components/docs-pagination';
import { DocsSidebar } from './docs-layout/components/navigation';
import { DocsToc } from './docs-layout/components/toc';

type DocsLayoutPageProps = {
	section?: string;
	slug?: string;
};

type DocsLayoutRenderProps = LayoutProps<JsxRenderable> & DocsLayoutPageProps;

type ShellLayoutProps = {
	class?: string;
	showBurger?: boolean;
	children?: JsxRenderable;
};

const { content, layoutComponents, shellLayout } = getDocsKit();
const manifestData = serializeDocsManifestData(projectDocsManifest(content));
const ShellLayout = shellLayout as (props: ShellLayoutProps) => JsxRenderable;

export const DocsLayout = eco.layout<JsxRenderable>({
	dependencies: {
		stylesheets: ['./docs-layout.css'],
		components: layoutComponents,
	},
	render: ({ children, section, slug }: DocsLayoutRenderProps) => {
		const llmUrl = section && slug ? getDocsLlmUrl(section, slug) : undefined;
		const crumbs = section && slug ? resolveDocsBreadcrumb(content, section, slug) : [];

		return (
			<ShellLayout class="docs-layout" showBurger={true}>
				<script type="application/json" id="docs-manifest-data" safe>
					{manifestData}
				</script>
				<DocsSidebar />
				<div class="docs-layout__content">
					<DocsBar crumbs={crumbs} llmUrl={llmUrl} />
					<div class="prose">{children}</div>
					<DocsPagination />
				</div>
				<DocsToc />
			</ShellLayout>
		);
	},
});

export default DocsLayout;
