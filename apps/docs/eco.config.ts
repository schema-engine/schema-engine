import path from 'node:path';
import '@ecopages/radiant/server/install-ssr-runtime';
import { defineConfig } from '@ecopages/core/config';
import { postcssProcessorPlugin } from '@ecopages/postcss-processor/plugin';
import { tailwindV4Preset } from '@ecopages/postcss-processor/presets/tailwind-v4';
import { reactPlugin } from '@ecopages/react';
import { ecopagesJsxPlugin } from '@ecopages/ecopages-jsx';
import { contentProcessorPlugin } from '@ecopages/content-processor/plugin';
import { compareEntriesByField } from '@ecopages/content-processor';
import { createDocsMdxPlugins } from './src/mdx/plugins';
import { docsFrontmatterSchema } from './src/content/docs';
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
		postcssProcessorPlugin(
			tailwindV4Preset({
				referencePath: path.resolve(import.meta.dirname, 'src/styles/tailwind.css'),
			}),
		),
		contentProcessorPlugin({
			options: {
				collections: {
					docs: {
						contentDir: 'content/docs',
						extensions: ['.mdx'],
						orderBy: compareEntriesByField('order'),
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
