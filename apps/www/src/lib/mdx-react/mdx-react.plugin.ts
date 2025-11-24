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
 * The MDX plugin class
 * This plugin provides support for MDX components in Ecopages
 */
export class MDXPlugin extends IntegrationPlugin {
	renderer: RendererClass<EcoPagesElement>;

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
	async setupBunPlugin(options?: Readonly<CompileOptions>): Promise<void> {
		// @ts-expect-error: esbuild plugin vs bun plugin
		await Bun.plugin(mdx(deepMerge(options, defaultOptions)));
	}

	private buildImportMapSourceUrl(fileName: string): string {
		return `/${AssetFactory.RESOLVED_ASSETS_VENDORS_DIR}/${fileName}`;
	}

	private getDependencies(): AssetDefinition[] {
		return [
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
							'react-dom/client': this.buildImportMapSourceUrl('react-dom-esm.js'),
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
