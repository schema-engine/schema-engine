import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Shared config for the headless packages, whose test setup is identical: node
 * environment, `test/**` specs, and `@` aliased to the package's own `src`.
 *
 * @remarks
 * `testTimeout` is 30 seconds because a few specs build a TypeScript program or a bundle (the entry-point and
 * dependency checks), which takes several seconds when every spec file of a package runs in its own worker at once.
 * Vitest's 5 second default fails them on a loaded machine, not on a regression.
 */
export function nodeTestConfig(packageDir: string) {
	return defineConfig({
		test: {
			environment: 'node',
			include: ['test/**/*.test.ts'],
			testTimeout: 30_000,
		},
		resolve: {
			alias: {
				'@': path.resolve(packageDir, 'src'),
			},
		},
	});
}
