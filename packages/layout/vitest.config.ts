import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { browserProjectLimits } from '../../scripts/vitest-browser-limits.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const alias = { '@': path.resolve(dirname, 'src') };

/**
 * Dependencies the browser project pre-bundles before any test runs.
 *
 * @remarks
 * On a cold Vite cache a dependency first reached by a test is optimized mid-run, and Vite then reloads
 * the page ("Vite unexpectedly reloaded a test"). The specs import the package entry, which reaches both.
 */
const browserOptimizedDeps = ['zod/mini', '@ecopages/logger'];

/**
 * Two projects: the Node specs, and the browser specs that measure a real grid.
 *
 * @remarks
 * The browser project runs every engine Playwright ships, not only Chromium: its specs assert what
 * CSS a browser accepts (a math function inside a grid line), and engines differ in that.
 */
export default defineConfig({
	resolve: { alias },
	test: {
		projects: [
			{
				resolve: { alias },
				test: {
					name: 'unit',
					environment: 'node',
					include: ['test/**/*.test.ts'],
					exclude: ['test/**/*.browser.test.ts'],
				},
			},
			{
				resolve: { alias },
				optimizeDeps: { include: browserOptimizedDeps },
				test: {
					name: 'browser',
					...browserProjectLimits(1),
					include: ['test/**/*.browser.test.ts'],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }],
					},
				},
			},
		],
	},
});
