import { rehypePrettyCode } from 'rehype-pretty-code';
import { transformerCopyButton } from '@rehype-pretty/transformers';
import remarkGfm from 'remark-gfm';
import type { Pluggable, PluggableList } from 'unified';
import { withContentMdxPlugins } from '@ecopages/content-processor/mdx';
import { rehypeHeadingIds } from './rehype-heading-ids';
import { rehypePrettyCopyCompatibility } from './rehype-pretty-copy-compatibility';
import { DOCS_SHIKI_THEMES } from './shiki-themes';

export type DocsMdxPluginsOptions = {
	remarkPlugins?: PluggableList;
	rehypePlugins?: PluggableList;
};

/**
 * Docs-specific MDX plugins layered on top of content-collection defaults.
 *
 * @remarks
 * Order matters: heading ids first, then rehype-pretty-code with the copy-button transformer, then
 * the compatibility pass that rewrites that button's markup. The Shiki themes are fixed here so
 * fenced blocks and `CodeTabs` share `DOCS_SHIKI_THEMES`.
 */
export function createDocsMdxPlugins(options: DocsMdxPluginsOptions = {}) {
	const rehypePlugins = [
		rehypeHeadingIds,
		[
			rehypePrettyCode,
			{
				theme: DOCS_SHIKI_THEMES,
				defaultLang: { block: 'text' },
				transformers: [transformerCopyButton()],
			},
		],
		rehypePrettyCopyCompatibility,
		...(options.rehypePlugins ?? []),
	] satisfies Pluggable[];

	return withContentMdxPlugins({
		remarkPlugins: [remarkGfm, ...(options.remarkPlugins ?? [])],
		rehypePlugins,
	});
}
