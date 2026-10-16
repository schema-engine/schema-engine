import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('headless package surface', () => {
	test('root import never resolves react-hook-form', async () => {
		const resolved: string[] = [];
		await build({
			entryPoints: ['src/index.ts'],
			bundle: true,
			write: false,
			platform: 'browser',
			packages: 'external',
			tsconfig: 'tsconfig.json',
			plugins: [
				{
					name: 'record-adapter-resolution',
					setup(builder) {
						builder.onResolve({ filter: /^react-hook-form(?:\/|$)/ }, (args) => {
							resolved.push(args.path);
							return { path: args.path, external: true };
						});
					},
				},
			],
		});
		expect(resolved).toEqual([]);
	});

	test('styling is consumer owned and RHF is optional', () => {
		const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
		for (const dependency of ['class-variance-authority', 'clsx', 'tailwind-merge']) {
			expect(manifest.dependencies).not.toHaveProperty(dependency);
		}
		expect(manifest.peerDependenciesMeta['react-hook-form'].optional).toBe(true);
		expect(manifest.exports).toHaveProperty('./adapters/react-hook-form');
		expect(manifest.exports).toHaveProperty('./hooks');
		expect(manifest.exports).toHaveProperty('./primitives');
		expect(manifest.exports).not.toHaveProperty('./registries/builder-registry');
	});
});
