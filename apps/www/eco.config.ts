import { mdxPlugin } from "./src/lib/mdx-react/mdx-react.plugin";
import { ConfigBuilder } from "@ecopages/core";
import { postcssProcessorPlugin } from "@ecopages/postcss-processor";
import { reactPlugin } from "@ecopages/react";
import remarkGfm from 'remark-gfm'

const config = await new ConfigBuilder()
	.setRootDir(import.meta.dir)
	.setBaseUrl(import.meta.env.ECOPAGES_BASE_URL as string)
	.setIntegrations([
		mdxPlugin({
			compilerOptions: {
				format: "detect",
				outputFormat: "program",
				jsxImportSource: "react",
				jsxRuntime: "automatic",
				development: import.meta.env.NODE_ENV === "development",
				remarkPlugins: [remarkGfm],
			},
		}),
		reactPlugin(),
	])
	.setProcessors([postcssProcessorPlugin()])
	.setError404Template("404.tsx")
	.setIncludesTemplates({
		head: "head.tsx",
		html: "html.tsx",
		seo: "seo.tsx",
	})
	.build();

export default config;
