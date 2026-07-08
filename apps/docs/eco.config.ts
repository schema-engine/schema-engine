import path from 'node:path';
import { ConfigBuilder } from '@ecopages/core/config-builder';
import { ecopagesJsxPlugin } from '@ecopages/ecopages-jsx';
import { postcssProcessorPlugin } from '@ecopages/postcss-processor';
import { tailwindV4Preset } from '@ecopages/postcss-processor/presets/tailwind-v4';
import { getDocsMdxPluginOptions } from './src/docs-kit/mdx/mdx-plugin-options';

const appRoot = path.resolve(import.meta.dirname);

const config = await new ConfigBuilder()
	.setRootDir(appRoot)
	.setBaseUrl(process.env.ECOPAGES_BASE_URL ?? 'http://localhost:3000')
	.setIntegrations([
		ecopagesJsxPlugin({
			extensions: ['.tsx', '.kita.tsx'],
			mdx: getDocsMdxPluginOptions(),
		}),
	])
	.setDefaultMetadata({
		title: 'Schema Engine | Docs',
		description:
			'A JSON-driven form layer for the Ecopages framework. Type-safe, Zod-validated, framework-agnostic.',
		keywords: ['schema-engine', 'forms', 'json', 'zod', 'ecopages'],
	})
	.setAdditionalWatchPaths(['src/content', 'src/homepage', 'src/docs-kit', 'src/includes', 'src/lib'])
	.setProcessors([
		postcssProcessorPlugin(
			tailwindV4Preset({
				referencePath: path.resolve(appRoot, 'src/styles/tailwind.css'),
			}),
		),
	])
	.build();

export default config;
