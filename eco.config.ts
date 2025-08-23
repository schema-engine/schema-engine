import { mdxPlugin } from "./src/lib/mdx-react/mdx-react.plugin";
import { ConfigBuilder } from "@ecopages/core";
import { postcssProcessorPlugin } from "@ecopages/postcss-processor";
import { reactPlugin } from "@ecopages/react";
import mdx from '@mdx-js/esbuild';

/**
 * A bun plugin to process mdx files using mdx for React
 * Updated to use the correct configuration for React instead of KitaJS
 */
Bun.plugin(
	// @ts-expect-error: esbuild plugin vs bun plugin
	mdx({
		format: 'detect',
		outputFormat: 'program', 
		jsxImportSource: 'react',
		jsxRuntime: 'automatic',
		development: process.env.NODE_ENV === 'development',
	}),
);

const config = await new ConfigBuilder()
	.setRootDir(import.meta.dir)
	.setBaseUrl(import.meta.env.ECOPAGES_BASE_URL as string)
	.setIntegrations([mdxPlugin(), reactPlugin()])
	.setProcessors([postcssProcessorPlugin()])
	.setError404Template("404.tsx")
	.setIncludesTemplates({
		head: "head.tsx",
		html: "html.tsx",
		seo: "seo.tsx",
	})
	.build();;

export default config;
