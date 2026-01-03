import { mdxPlugin } from '@ecopages/mdx';
import { ConfigBuilder } from '@ecopages/core';
import { postcssProcessorPlugin } from '@ecopages/postcss-processor';
import { tailwindV4Preset } from '@ecopages/postcss-processor/presets/tailwind-v4';
import { reactPlugin } from '@ecopages/react';
import remarkGfm from 'remark-gfm';
import path from 'node:path';
import rehypePrettyCode from 'rehype-pretty-code';
// import { rehypeSimpleTableWrapper } from './src/plugins/rehype-simple-table-wrapper';
// import { transformerEscapeHtml } from './src/plugins/transformer-escape-html';

const config = await new ConfigBuilder()
	.setRootDir(import.meta.dir)
	.setBaseUrl(import.meta.env.ECOPAGES_BASE_URL)
	.setIntegrations([
		mdxPlugin({
			compilerOptions: {
				format: 'detect',
				outputFormat: 'program',
				jsxImportSource: 'react',
				jsxRuntime: 'automatic',
				development: import.meta.env.NODE_ENV === 'development',
				remarkPlugins: [remarkGfm],
				rehypePlugins: [
					[
						rehypePrettyCode,
						{
							theme: {
								light: 'light-plus',
								dark: 'dark-plus',
							},
							// transformers: [transformerEscapeHtml],
						},
					],
					// rehypeSimpleTableWrapper,
				],
			},
		}),
		reactPlugin(),
	])
	.setProcessors([
		postcssProcessorPlugin(
			tailwindV4Preset({
				referencePath: path.join(import.meta.dir, 'src/styles/tailwind.css'),
			}),
		),
	])
	.setDefaultMetadata({
		title: 'JSON Form Engine',
		description:
			'JSON Form Engine is a JSON-based, type-safe form builder for React. Define your forms entirely in JSON, and get automatic validation, real-time error handling, and Zod schemas for free.',
	})
	.setError404Template('404.tsx')
	.setIncludesTemplates({
		head: 'head.tsx',
		html: 'html.tsx',
		seo: 'seo.tsx',
	})
	.build();

export default config;
