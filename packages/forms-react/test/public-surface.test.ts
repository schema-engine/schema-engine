import { globSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('headless package surface', () => {
	test('no source file imports react-hook-form', () => {
		const importing = globSync('src/**/*.{ts,tsx}')
			.filter((file) => /from\s+['"]react-hook-form/.test(readFileSync(file, 'utf8')))
			.toSorted();
		expect(importing).toEqual([]);
	});

	test('styling is consumer owned and the form state is native', () => {
		const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
		for (const dependency of ['class-variance-authority', 'clsx', 'tailwind-merge']) {
			expect(manifest.dependencies).not.toHaveProperty(dependency);
		}
		for (const group of ['dependencies', 'devDependencies', 'peerDependencies', 'peerDependenciesMeta']) {
			expect(manifest[group] ?? {}).not.toHaveProperty('react-hook-form');
		}
		expect(manifest.exports).not.toHaveProperty('./adapters/react-hook-form');
		expect(manifest.exports).toHaveProperty('./adapters');
		expect(manifest.exports).toHaveProperty('./hooks');
		expect(manifest.exports).toHaveProperty('./primitives');
		expect(manifest.exports).not.toHaveProperty('./registries/builder-registry');
	});
});
