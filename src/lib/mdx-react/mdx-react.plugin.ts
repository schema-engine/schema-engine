import { IntegrationPlugin, type IntegrationPluginConfig } from '@ecopages/core/plugins/integration-plugin';
import { MDXReactRenderer } from './mdx-react-renderer';
import { AssetFactory, type AssetDefinition } from '@ecopages/core/services/asset-processing-service';

/**
 * The name of the MDX plugin
 */
export const PLUGIN_NAME = 'MDX_REACT';

/**
 * The MDX plugin class
 * This plugin provides support for MDX components in Ecopages
 */
export class MDXPlugin extends IntegrationPlugin {
	renderer = MDXReactRenderer;

	constructor(options?: Omit<IntegrationPluginConfig, 'name'>) {
		super({
			name: PLUGIN_NAME,
			extensions: ['.mdx'],
			...options,
		});

		this.integrationDependencies.unshift(...this.getDependencies());
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
export function mdxPlugin(options?: Omit<IntegrationPluginConfig, 'name'>): MDXPlugin {
	return new MDXPlugin(options);
}
