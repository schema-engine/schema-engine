import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Shared config for the headless packages, whose test setup is identical: node
 * environment, `test/**` specs, and `@` aliased to the package's own `src`.
 */
export function nodeTestConfig(packageDir: string) {
	return defineConfig({
		test: {
			environment: 'node',
			include: ['test/**/*.test.ts'],
		},
		resolve: {
			alias: {
				'@': path.resolve(packageDir, 'src'),
			},
		},
	});
}
