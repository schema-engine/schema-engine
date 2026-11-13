import path from 'node:path';
import '@ecopages/radiant/server/install-ssr-runtime';
import { defineConfig } from '@ecopages/core/config';
import { lightningCssProcessorPlugin } from '@ecopages/lightningcss-processor';
import { suffixNesting } from '@ecopages/lightningcss-processor/plugins/suffix-nesting';
import { tailwindV4Preset } from '@ecopages/lightningcss-processor/presets/tailwind-v4';
import { reactPlugin } from '@ecopages/react';
import { ecopagesJsxPlugin } from '@ecopages/ecopages-jsx';
import { contentProcessorPlugin } from '@ecopages/content-processor/plugin';
import { createDocsMdxPlugins } from './src/mdx/plugins';
import { compareDocsEntries, docsFrontmatterSchema } from './src/content/docs';
import { devToolbar } from '@ecopages/dev-toolbar/config';
import { configuredSiteOrigin, DOCS_SITEMAP_EXTRA_URLS } from './src/lib/docs/site-meta';

/**
 * @remarks
 * Radiant's server runtime is installed first so Radiant hosts render on the
 * server in every route, including the React-owned demo previews.
 */
export default defineConfig({
	rootDir: import.meta.dirname,
	baseUrl: configuredSiteOrigin(),
	sitemap: {
		enabled: true,
		extraUrls: [...DOCS_SITEMAP_EXTRA_URLS],
		exclude: ['/404', '/500'],
	},
	integrations: [
		reactPlugin({
			extensions: ['.react.tsx'],
			explicitGraph: true,
		}),
		ecopagesJsxPlugin({
			mdx: {
				...createDocsMdxPlugins(),
			},
		}),
	],
	defaultMetadata: {
		title: 'Schema Engine | Docs',
		description:
			'JSON-driven, type-safe forms with Zod Mini validation and Standard Schema registrations. Four first-party packages: forms, forms-react, actions, and registry.',
		keywords: ['schema-engine', 'forms', 'json', 'zod', 'react'],
		image: '/assets/images/default-og.png',
	},
	processors: [
		lightningCssProcessorPlugin({
			...tailwindV4Preset({
				referencePath: path.resolve(import.meta.dirname, 'src/styles/tailwind.css'),
			}),
			targets: ['chrome >= 111', 'safari >= 16.4', 'firefox >= 128'],
			plugins: [suffixNesting()],
		}),
		contentProcessorPlugin({
			options: {
				collections: {
					docs: {
						contentDir: 'content/docs',
						extensions: ['.mdx'],
						orderBy: compareDocsEntries,
						schema: docsFrontmatterSchema,
						entryType: './src/content/docs#DocsFrontmatter',
					},
				},
			},
		}),
	],
	additionalWatchPaths: [
		'src/data',
		'src/content',
		'../../registry/shared/forms',
		'../../packages/forms-react/.storybook/ui',
		'../../packages/forms-radiant/dist',
	],
	devToolbar: devToolbar(),
});
