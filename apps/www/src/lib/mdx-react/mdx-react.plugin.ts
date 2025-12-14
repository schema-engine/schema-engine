import {
	IntegrationPlugin,
	type IntegrationPluginConfig,
	type RendererClass,
} from '@ecopages/core/plugins/integration-plugin';
import { createMDXReactRenderer } from './mdx-react-renderer';
import { AssetFactory, type AssetDefinition } from '@ecopages/core/services/asset-processing-service';
import mdx from '@mdx-js/esbuild';
import type { CompileOptions } from '@mdx-js/mdx';
import { deepMerge, type EcoPagesElement } from '@ecopages/core';

export const PLUGIN_NAME = 'MDX_REACT';

export type MDXPluginConfig = Partial<Omit<IntegrationPluginConfig, 'name'>> & { compilerOptions?: CompileOptions };

const defaultOptions: CompileOptions = {
	format: 'detect',
	outputFormat: 'program',
	jsxImportSource: 'react',
	jsxRuntime: 'automatic',
	development: process.env.NODE_ENV === 'development',
};

/**
 * The MDX Plugin class.
 *
 * This plugin handles the integration of MDX with the Ecopages framework.
 * Its primary responsibilities are:
 * 1. **Global Plugin Registration**: Registers the `@mdx-js/esbuild` plugin with Bun.
 *    This enables the entire runtime (and bundler) to natively process `.mdx` files.
 * 2. **Renderer Initialization**: Creates and provides the `MDXReactRenderer` instance.
 * 3. **Dependency Injection**: Injects necessary React dependencies (react, react-dom)
 *    into the page head via import maps and module scripts.
 */
export class MDXPlugin extends IntegrationPlugin {
	renderer: RendererClass<EcoPagesElement>;

	private dependencies: AssetDefinition[] | undefined;

	/**
	 * Creates a new instance of the MDXPlugin.
	 *
	 * @param options - Configuration options for the MDX plugin.
	 * @param options.compilerOptions - Options passed to the MDX compiler (e.g. remark/rehype plugins).
	 * @param options.extensions - File extensions to handle (defaults to ['.mdx']).
	 */
	constructor({ compilerOptions, ...options }: MDXPluginConfig = { extensions: ['.mdx'] }) {
		super({
			...options,
			name: PLUGIN_NAME,
			extensions: options.extensions ?? ['.mdx'],
		});

		const finalCompilerOptions = deepMerge(compilerOptions, defaultOptions);

		this.renderer = createMDXReactRenderer(finalCompilerOptions);

		void this.setupBunPlugin(finalCompilerOptions);

		this.integrationDependencies.unshift(...this.getDependencies());
	}
	/**
	 * Registers the MDX plugin with Bun globally.
	 *
	 * This is a critical step that allows Bun's bundler and runtime to transpile MDX files on the fly.
	 * It uses the `@mdx-js/esbuild` plugin, adapted for Bun.
	 *
	 * @param options - Compile options for the MDX processor.
	 */
	async setupBunPlugin(options?: Readonly<CompileOptions>): Promise<void> {
		// @ts-expect-error: esbuild plugin vs bun plugin
		await Bun.plugin(mdx(deepMerge(options, defaultOptions)));
	}

	/**
	 * Helper to construct the source URL for import maps.
	 */
	private buildImportMapSourceUrl(fileName: string): string {
		return `/${AssetFactory.RESOLVED_ASSETS_VENDORS_DIR}/${fileName}`;
	}

	/**
	 * Retrieves the integration dependencies (assets) required for MDX React pages.
	 *
	 * This includes:
	 * 1. An **Import Map** to define where `react` and `react-dom` can be loaded from.
	 * 2. **Node Module Scripts** for exposing `react` and `react-dom` ESM modules to the browser.
	 */
	private getDependencies(): AssetDefinition[] {
		if (this.dependencies) return this.dependencies;

		this.dependencies = [
			AssetFactory.createInlineContentScript({
				position: 'head',
				bundle: false,
				content: JSON.stringify(
					{
						imports: {
							react: this.buildImportMapSourceUrl('react-esm.js'),
							'react/jsx-runtime': this.buildImportMapSourceUrl('react-esm.js'),
							'react/jsx-dev-runtime': this.buildImportMapSourceUrl('react-esm.js'),
							'react-dom': this.buildImportMapSourceUrl('react-dom-esm.js'),
						},
					},
					null,
					2,
				),
				attributes: {
					type: 'importmap',
				},
			}),
			AssetFactory.createNodeModuleScript({
				position: 'head',
				importPath: '@ecopages/react/react-esm.ts',
				name: 'react-esm',
				attributes: {
					type: 'module',
					defer: '',
				},
			}),
			AssetFactory.createNodeModuleScript({
				position: 'head',
				importPath: '@ecopages/react/react-dom-esm.ts',
				name: 'react-dom-esm',
				attributes: {
					type: 'module',
					defer: '',
				},
			}),
		];

		return this.dependencies;
	}
}

/**
 * Factory function to create a MDX plugin instance
 * @param options Configuration options for the MDX plugin
 * @returns A new MDXPlugin instance
 */
export function mdxPlugin(options?: MDXPluginConfig): MDXPlugin {
	return new MDXPlugin(options);
}
