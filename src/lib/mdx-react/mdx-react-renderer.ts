/**
 * This module contains the MDX renderer
 * @module
 */

import {
	type EcoComponentConfig,
	type EcoPageFile,
	type EcoPagesElement,
	type GetMetadata,
	IntegrationRenderer,
	type IntegrationRendererRenderOptions,
	invariant,
	type PageMetadataProps,
	type RouteRendererBody,
} from '@ecopages/core';
import { rapidhash } from '@ecopages/core/hash';
import React, { type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { PLUGIN_NAME } from './mdx-react.plugin';
import {
	AssetFactory,
	type AssetProcessingService,
	type ProcessedAsset,
} from '@ecopages/core/services/asset-processing-service';
import fs from 'node:fs/promises';
import { compile, type CompileOptions } from '@mdx-js/mdx';
import type { EcoPagesAppConfig } from 'node_modules/@ecopages/core/_dist/src/internal-types';

/**
 * Error thrown when an error occurs while rendering a React component.
 */
export class ReactRenderError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ReactRenderError';
	}
}

/**
 * Error thrown when an error occurs while bundling a React component.
 */
export class BundleError extends Error {
	constructor(
		message: string,
		public readonly logs: string[],
	) {
		super(message);
		this.name = 'BundleError';
	}
}

/**
 * A structure representing an MDX file
 */
export type MDXReactFile = {
	default: ReactNode;
	layout?: React.ComponentType<{ children: ReactNode }>;
	config?: EcoComponentConfig;
	getMetadata: GetMetadata;
};

/**
 * Options for the MDX renderer
 */
interface MDXReactIntegrationRendererOptions<C = ReactNode> extends IntegrationRendererRenderOptions<C> {
	layout?: React.ComponentType<{ children: ReactNode }>;
	config?: EcoComponentConfig;
}

/**
 * Constructor options for MDXReactRenderer
 */
interface MDXReactRendererConstructorOptions {
	appConfig: EcoPagesAppConfig;
	assetProcessingService: AssetProcessingService;
	resolvedIntegrationDependencies: ProcessedAsset[];
	runtimeOrigin: string;
	compilerOptions: CompileOptions;
}

/**
 * Generates scripts for MDX components and hydration
 */
class ScriptsGenerator {
	private compilerOptions: CompileOptions;

	constructor(compilerOptions: CompileOptions) {
		this.compilerOptions = compilerOptions;
	}

	/**
	 * Creates a hydration script for client-side React component mounting
	 */
	createHydrationScript(componentName: string): string {
		return `
import { hydrateRoot, createElement } from "react";

async function hydrate() {
    try {
        const root = document.querySelector('[data-react-root]');
        if (!root) {
            console.warn('[MDX React] No hydration root found');
            return;
        }
        
        const module = await import("/assets/${componentName}.js");
        const Component = module.default;
        
        if (typeof Component !== 'function') {
            console.error('[MDX React] Component is not a function:', typeof Component, Component);
            return;
        }
        
        hydrateRoot(root, createElement(Component));
    } catch (error) {
        console.error('[MDX React] Hydration failed:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrate);
} else {
    hydrate();
}
        `.trim();
	}

	/**
	 * Creates a wrapper script for MDX content with layout support
	 */
	async createMDXWrapperScript(pagePath: string): Promise<string> {
		try {
			const mdxContent = await fs.readFile(pagePath, 'utf-8');

			const compiledMDX = await compile(mdxContent, this.compilerOptions);

			const compiledCode = compiledMDX.toString();

			const modifiedCode = compiledCode
				.replace(/export default function (\w+)/g, 'function $1')
				.replace(/export default /g, 'const MDXContent = ')
				.replace(/export const layout/g, 'const layout')
				.replace(/export\s*{[^}]*}/g, '')
				.replace(/export\s+/g, '');

			return `
import React from 'react';
${modifiedCode}

function WrappedMDXComponent(props) {
    const pageElement = React.createElement(MDXContent || (() => React.createElement('div', null, 'No content')));
    
    if (typeof layout !== 'undefined') {
        return React.createElement(layout, { children: pageElement });
    }
    
    return pageElement;
}

export default WrappedMDXComponent;
        `.trim();
		} catch (error) {
			console.error('[MDX React] Failed to compile MDX file:', error);
			return `
import React from 'react';
function WrappedMDXComponent(props) {
    return React.createElement('div', null, 'Error: Failed to compile MDX content');
}
export default WrappedMDXComponent;
        `.trim();
		}
	}
}

/**
 * A renderer for the MDX integration.
 */
export class MDXReactRenderer extends IntegrationRenderer<EcoPagesElement> {
	name = PLUGIN_NAME;
	private scriptsGenerator: ScriptsGenerator;

	constructor(options: MDXReactRendererConstructorOptions) {
		super(options);
		this.scriptsGenerator = new ScriptsGenerator(options.compilerOptions);
	}

	override async buildRouteRenderAssets(pagePath: string): Promise<ProcessedAsset[]> {
		try {
			const pathHash = rapidhash(pagePath);
			const componentName = `ecopages-react-${pathHash}`;

			const wrapperScript = await this.scriptsGenerator.createMDXWrapperScript(pagePath);

			const dependencies = [
				AssetFactory.createContentScript({
					position: 'head',
					content: wrapperScript,
					name: componentName,
					excludeFromHtml: true,
					bundle: true,
					bundleOptions: {
						external: [
							'react',
							'react-dom',
							'react/jsx-runtime',
							'react/jsx-dev-runtime',
							'react-dom/client',
						],
						...(import.meta.env.NODE_ENV === 'production' && {
							minify: true,
							splitting: false,
							treeshaking: true,
						}),
					},
					attributes: {
						type: 'module',
						defer: '',
					},
				}),

				AssetFactory.createContentScript({
					position: 'head',
					content: this.scriptsGenerator.createHydrationScript(componentName),
					name: `${componentName}-hydration`,
					bundle: false,
					attributes: {
						type: 'module',
						defer: '',
					},
				}),
			];

			if (!this.assetProcessingService) throw new Error('AssetProcessingService is not set');

			return await this.assetProcessingService.processDependencies(dependencies, componentName);
		} catch (error) {
			if (error instanceof BundleError) console.error('[ecopages] Bundle errors:', error.logs);

			throw new ReactRenderError(
				`Failed to generate hydration script: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	protected override async importPageFile(file: string): Promise<
		EcoPageFile<{
			layout?: React.ComponentType<{ children: ReactNode }>;
			config?: EcoComponentConfig;
		}>
	> {
		try {
			const mdxModule = await import(file);

			const { default: Page, layout, getMetadata, config } = mdxModule;

			if (typeof Page !== 'function') {
				throw new Error(`MDX file must export a default function, got ${typeof Page}: ${String(Page)}`);
			}

			return {
				default: Page,
				layout: layout as React.ComponentType<{ children: ReactNode }> | undefined,
				getMetadata: getMetadata as GetMetadata | undefined,
				config: config as EcoComponentConfig | undefined,
			};
		} catch (error) {
			invariant(false, `Error importing MDX file: ${error}`);
		}
	}

	async render({
		metadata,
		Page,
		HtmlTemplate,
		layout,
	}: MDXReactIntegrationRendererOptions): Promise<RouteRendererBody> {
		try {
			if (typeof Page !== 'function') {
				throw new Error(`Page must be a React component function, got ${typeof Page}: ${String(Page)}`);
			}

			const pageElement = layout
				? React.createElement(layout, undefined, React.createElement(Page as React.ComponentType))
				: React.createElement(Page as React.ComponentType);

			const wrappedContent = React.createElement(
				'div',
				{
					'data-react-root': true,
				},
				pageElement,
			);

			const htmlElement = React.createElement(
				HtmlTemplate as React.ComponentType<{
					children: ReactNode;
					metadata: PageMetadataProps;
				}>,
				{
					metadata,
					children: wrappedContent,
				},
			);

			const body = renderToString(htmlElement);

			return this.DOC_TYPE + body;
		} catch (error) {
			throw new Error(`[ecopages] Error rendering page: ${error}`);
		}
	}
}

/**
 * Factory function to create an MDX React renderer class with specific compiler options
 */
export function createMDXReactRenderer(compilerOptions: CompileOptions) {
	return class extends MDXReactRenderer {
		constructor(options: {
			appConfig: any;
			assetProcessingService: AssetProcessingService;
			resolvedIntegrationDependencies: ProcessedAsset[];
			runtimeOrigin: string;
		}) {
			super({
				...options,
				compilerOptions,
			});
		}
	};
}
