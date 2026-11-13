import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';
import { describe, expect, test } from 'vitest';

const packageDirectory = resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(readFileSync(join(packageDirectory, 'package.json'), 'utf8')) as {
	exports: Record<string, { types: string; import: string }>;
	peerDependencies: Record<string, string>;
	peerDependenciesMeta?: Record<string, { optional?: boolean }>;
	dependencies: Record<string, string>;
};

describe('yaml subpath wiring', () => {
	test('is its own export, apart from the root entry', () => {
		expect(manifest.exports['./yaml']).toEqual({
			types: './dist/yaml/index.d.ts',
			import: './dist/yaml/index.js',
		});
		expect(manifest.exports['.']?.import).toBe('./dist/index.js');
	});

	test('yaml is an optional peer dependency, not a dependency', () => {
		expect(manifest.peerDependencies.yaml).toBeDefined();
		expect(manifest.peerDependenciesMeta?.yaml?.optional).toBe(true);
		expect(manifest.dependencies).not.toHaveProperty('yaml');
	});
});

describe('the root entry does not need yaml', () => {
	test('bundling it with yaml unresolvable succeeds and leaves no yaml in the output', async () => {
		const result = await build({
			entryPoints: [join(packageDirectory, 'src/index.ts')],
			bundle: true,
			write: false,
			format: 'esm',
			platform: 'neutral',
			logLevel: 'silent',
			external: ['@ecopages/logger', '@standard-schema/spec'],
			plugins: [
				{
					name: 'no-yaml',
					setup(api) {
						api.onResolve({ filter: /^yaml(\/|$)/ }, (args) => ({
							errors: [{ text: `The root entry imported ${args.path}` }],
						}));
					},
				},
			],
		});

		const output = result.outputFiles.map((file) => file.text).join('\n');
		expect(output).not.toMatch(/from\s*["']yaml/);
		expect(output).not.toContain('parseDocument');
	});

	test('the yaml entry does import yaml, so the check above can fail', async () => {
		await expect(
			build({
				entryPoints: [join(packageDirectory, 'src/yaml/index.ts')],
				bundle: true,
				write: false,
				format: 'esm',
				platform: 'neutral',
				logLevel: 'silent',
				plugins: [
					{
						name: 'no-yaml',
						setup(api) {
							api.onResolve({ filter: /^yaml(\/|$)/ }, (args) => ({
								errors: [{ text: `imported ${args.path}` }],
							}));
						},
					},
				],
			}),
		).rejects.toThrow(/imported yaml/);
	});

	test('the yaml source never reaches node built-ins', () => {
		const sources = ['src/yaml/index.ts', 'src/yaml/parse.ts', 'src/yaml/stringify.ts'];
		for (const source of sources) {
			const text = readFileSync(join(packageDirectory, source), 'utf8');
			expect(text, source).not.toMatch(/from\s+['"](node:|fs|path|url|os)/);
		}
	});
});
