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

/**
 * @remarks
 * Install Radiant's server runtime before React routes import the shared docs shell.
 */
export default defineConfig({
	rootDir: import.meta.dirname,
	baseUrl: process.env.ECOPAGES_BASE_URL ?? 'http://localhost:3000',
	integrations: [
		reactPlugin({
			extensions: ['.react.tsx'],
			explicitGraph: true,
			mdx: {
				extensions: ['.react.mdx'],
			},
		}),
		ecopagesJsxPlugin({
			mdx: {
				extensions: ['.radiant.mdx', '.mdx'],
				compilerOptions: { mdxExtensions: ['.radiant.mdx', '.mdx'] },
				...createDocsMdxPlugins({
					rehypePrettyCode: {
						theme: {
							light: 'light-plus',
							dark: 'dark-plus',
						},
					},
				}),
			},
		}),
	],
	defaultMetadata: {
		title: 'Schema Engine | Docs',
		description:
			'JSON-driven, type-safe forms with Zod Mini validation and Standard Schema registrations. Four first-party packages: forms, forms-react, actions, and registry.',
		keywords: ['schema-engine', 'forms', 'json', 'zod', 'react'],
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
						extensions: ['.radiant.mdx', '.react.mdx', '.mdx'],
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
