import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const packageRoot = path.resolve(import.meta.dirname, '..');

describe('headless package surface', () => {
	test('no source file imports react-hook-form', () => {
		const sources = globSync('src/**/*.{ts,tsx}', { cwd: packageRoot });
		expect(sources.length).toBeGreaterThan(50);
		const importing = sources
			.filter((file) => /['"]react-hook-form['"/]/.test(readFileSync(path.join(packageRoot, file), 'utf8')))
			.toSorted();
		expect(importing).toEqual([]);
	});

	test('styling is consumer owned and the form state is native', () => {
		const manifest = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
		for (const dependency of ['class-variance-authority', 'clsx', 'tailwind-merge']) {
			expect(manifest.dependencies).not.toHaveProperty(dependency);
		}
		for (const group of ['dependencies', 'devDependencies', 'peerDependencies', 'peerDependenciesMeta']) {
			expect(manifest[group] ?? {}).not.toHaveProperty('react-hook-form');
		}
		expect(manifest.exports).not.toHaveProperty('./adapters/react-hook-form');
		expect(manifest.exports).not.toHaveProperty('./adapters');
		expect(manifest.exports).toHaveProperty('./hooks');
		expect(manifest.exports).toHaveProperty('./primitives');
		expect(manifest.exports).not.toHaveProperty('./registries/builder-registry');
	});
});
