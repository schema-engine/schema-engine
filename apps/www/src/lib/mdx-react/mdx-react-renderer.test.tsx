import { describe, expect, it, mock } from 'bun:test';
import { MDXReactRenderer } from './mdx-react-renderer';
import React, { type JSX } from 'react';
import type { EcoComponent, HtmlTemplateProps } from '@ecopages/core';
import type {
	AssetDefinition,
	ContentScriptAsset,
	FileScriptAsset,
} from '@ecopages/core/services/asset-processing-service';

const mockConfig = {
	srcDir: '/app/src',
	distDir: '/app/dist',
	baseUrl: 'http://localhost:3000',
	defaultMetadata: {
		title: 'Ecopages',
		description: 'Ecopages',
	},
};

const mockProcessDependencies = mock((deps) => Promise.resolve(deps));

const mockAssetProcessingService = {
	processDependencies: mockProcessDependencies,
} as any;

const HtmlTemplate: EcoComponent<HtmlTemplateProps, JSX.Element> = ({ headContent, children }) => (
	<html lang="en">
		<head>{headContent}</head>
		<body>{children}</body>
	</html>
);

const Page = () => <div>Hello World</div>;

const ErrorPage = () => {
	throw new Error('Failed to render component');
};

const Layout = ({ children }: { children: React.ReactNode }) => <div data-testid="layout-wrapper">{children}</div>;

type ExtendedFileScriptAsset = Omit<FileScriptAsset, 'bundleOptions'> & {
	bundleOptions: FileScriptAsset['bundleOptions'] & { plugins?: unknown[] };
};

describe('MDXReactRenderer', () => {
	const renderer = new MDXReactRenderer({
		appConfig: mockConfig as any,
		assetProcessingService: mockAssetProcessingService,
		resolvedIntegrationDependencies: [],
		runtimeOrigin: 'http://localhost:3000',
	});

	it('should be defined', () => {
		expect(renderer).toBeDefined();
		expect(renderer.name).toBe('MDX_REACT');
	});

	it('should build route render assets correctly', async () => {
		const pagePath = '/app/src/pages/docs/intro.mdx';
		await renderer.buildRouteRenderAssets(pagePath);

		expect(mockProcessDependencies).toHaveBeenCalled();
		const calls = mockProcessDependencies.mock.calls;
		expect(calls.length).toBeGreaterThan(0);
		const assets = calls[0][0] as AssetDefinition[];
		expect(assets.length).toBe(2);

		const fileScript = assets.find((a) => a.kind === 'script' && a.source === 'file' && a.filepath === pagePath);
		expect(fileScript).toBeDefined();
		expect((fileScript as FileScriptAsset).filepath).toBe(pagePath);

		// Validating that the forced 'plugins' property exists as expected
		const bundleOptions = (fileScript as ExtendedFileScriptAsset).bundleOptions;
		expect(bundleOptions).toBeDefined();
		expect(bundleOptions?.plugins).toBeDefined();
		expect(bundleOptions?.plugins?.length).toBeGreaterThan(0);

		const hydrationScript = assets.find(
			(a) => 'name' in a && (a.name as string).includes('hydration'),
		) as ContentScriptAsset;
		expect(hydrationScript).toBeDefined();
		expect(hydrationScript.content).toContain('import * as MDXComponent');
	});

	it('should render the page', async () => {
		const body = await renderer.render({
			params: {},
			query: {},
			props: {},
			resolvedDependencies: [],
			file: '/mock/file.mdx',
			metadata: {
				title: 'Test Page',
				description: 'Test Description',
			},
			dependencies: {
				scripts: [],
				stylesheets: [],
			},
			Page,
			HtmlTemplate,
		});

		expect(body).toContain('<!DOCTYPE html>');
		expect(body).toContain('<div>Hello World</div>');
		expect(body).toContain('<html lang="en">');
		expect(body).toContain('<body>');
	});

	it('should wrap the page with layout if provided', async () => {
		const body = await renderer.render({
			params: {},
			query: {},
			props: {},
			resolvedDependencies: [],
			file: '/mock/layout-file.mdx',
			metadata: {
				title: 'Test Page with Layout',
				description: 'Description',
			},
			dependencies: {
				scripts: [],
				stylesheets: [],
			},
			Page,
			HtmlTemplate,
			layout: Layout,
		});

		expect(body).toContain('<div data-testid="layout-wrapper">');
		expect(body).toContain('<div>Hello World</div>');
	});

	it('should throw an error if the page fails to render', async () => {
		expect(
			renderer.render({
				params: {},
				query: {},
				props: {},
				file: '/mock/error.mdx',
				resolvedDependencies: [],
				metadata: {
					title: 'Error Page',
					description: 'Error Description',
				},
				dependencies: {
					scripts: [],
					stylesheets: [],
				},
				Page: ErrorPage,
				HtmlTemplate,
			}),
		).rejects.toThrow('Failed to render component');
	});
});
