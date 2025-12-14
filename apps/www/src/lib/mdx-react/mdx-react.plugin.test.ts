import { describe, expect, it } from 'bun:test';
import { MDXPlugin } from './mdx-react.plugin';

describe('MDXPlugin', () => {
	it('should initialize with default options', () => {
		const plugin = new MDXPlugin();
		expect(plugin.name).toBe('MDX_REACT');
		expect(plugin.extensions).toEqual(['.mdx']);
	});

	it('should accept custom compiler options', () => {
		const options = {
			compilerOptions: {
				remarkPlugins: [() => {}],
			},
		};
		const plugin = new MDXPlugin(options);
		expect(plugin.name).toBe('MDX_REACT');
	});

	it('should register dependencies correctly', () => {
		const plugin = new MDXPlugin();
		const deps = (plugin as any).integrationDependencies;

		expect(deps.length).toBeGreaterThanOrEqual(3);

		const importMap = deps.find((d: any) => d.attributes?.type === 'importmap');
		expect(importMap).toBeDefined();

		const content = JSON.parse(importMap?.content || '{}');
		expect(content.imports['react-dom']).toContain('react-esm.js');
	});

	it('should cache dependencies on repeated calls', () => {
		const plugin = new MDXPlugin();
		const deps1 = (plugin as any).getDependencies();
		const deps2 = (plugin as any).getDependencies();
		expect(deps1).toBe(deps2);
	});
});
