import { plugin, type BunPlugin } from 'bun';
import { compile } from '@mdx-js/mdx';

/**
 * A bun plugin to process mdx files using mdx for React
 * This plugin processes all .mdx files for React JSX
 */
export const mdxReactPlugin: BunPlugin = {
	name: 'mdx-react-loader',
	setup(build) {
		build.onLoad({ filter: /\.mdx$/ }, async (args) => {
			const source = await Bun.file(args.path).text();

			try {
				const compiled = await compile(source, {
					outputFormat: 'function-body',
					jsxImportSource: 'react',
					jsxRuntime: 'automatic',
					development: process.env.NODE_ENV === 'development',
					format: 'mdx',
				});

				console.log('Compiled MDX:', compiled);

				return {
					contents: compiled,
					loader: 'tsx',
				};
			} catch (error) {
				console.error(`Error compiling MDX file ${args.path}:`, error);
				throw error;
			}
		});
	},
};

plugin(mdxReactPlugin);
