import path from 'node:path';
import remarkGfm from 'remark-gfm';
import { ConfigBuilder } from '@ecopages/core/config-builder';
import { postcssProcessorPlugin } from '@ecopages/postcss-processor';
import { tailwindV4Preset } from '@ecopages/postcss-processor/presets/tailwind-v4';
import { rehypePrettyCode } from 'rehype-pretty-code';
import { reactPlugin } from '@ecopages/react';
import { ecoRouter } from '@ecopages/react-router';

const config = await new ConfigBuilder()
	.setRootDir(import.meta.dir)
	.setBaseUrl(import.meta.env.ECOPAGES_BASE_URL)
	.setIntegrations([
		reactPlugin({
			router: ecoRouter(),
			mdx: {
				enabled: true,
				compilerOptions: {
					format: 'detect',
					outputFormat: 'program',
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
							},
						],
					],
				},
			},
		}),
	])
	.setProcessors([
		postcssProcessorPlugin(
			tailwindV4Preset({
				referencePath: path.resolve(import.meta.dir, 'src/styles/tailwind.css'),
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
