import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dependencies the browser project pre-bundles before any test runs.
 *
 * @remarks
 * On a cold Vite cache, a dependency first reached while a test file loads is optimized mid-run, and Vite
 * reloads the page ("Vite unexpectedly reloaded a test"). The form recipe tests render React and Radiant forms,
 * which reach these through the built packages.
 */
const browserOptimizedDeps = [
	'@ecopages/jsx/client',
	'@ecopages/radiant/context',
	'@ecopages/radiant/form-associated-element',
	'@ecopages/radiant/is-server',
	'@ecopages/signals',
	'@ecopages/radiant-ui/alert',
	'@ecopages/radiant-ui/autocomplete',
	'@ecopages/radiant-ui/badge',
	'@ecopages/radiant-ui/button',
	'@ecopages/radiant-ui/checkbox',
	'@ecopages/radiant-ui/checkbox-group',
	'@ecopages/radiant-ui/combobox',
	'@ecopages/radiant-ui/field',
	'@ecopages/radiant-ui/form',
	'@ecopages/radiant-ui/heading',
	'@ecopages/radiant-ui/input',
	'@ecopages/radiant-ui/label',
	'@ecopages/radiant-ui/listbox',
	'@ecopages/radiant-ui/number-field',
	'@ecopages/radiant-ui/radio-group',
	'@ecopages/radiant-ui/select',
	'@ecopages/radiant-ui/slider',
	'@ecopages/radiant-ui/switch',
	'@ecopages/radiant-ui/tag-group',
	'@ecopages/radiant-ui/textarea',
	'country-flag-icons/string/3x2',
	'imask',
	'libphonenumber-js',
	'react',
	'react-dom/client',
];

export default defineConfig({
	root: dirname,
	resolve: {
		alias: {
			'@': path.resolve(dirname, 'src'),
		},
	},
	test: {
		fileParallelism: false,
		projects: [
			{
				resolve: {
					alias: {
						'@': path.resolve(dirname, 'src'),
					},
				},
				test: {
					name: 'unit',
					include: ['test/**/*.test.ts', 'scripts/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
					exclude: ['src/**/*.test.browser.ts'],
					environment: 'node',
					setupFiles: ['./test/unit-setup.ts'],
				},
			},
			{
				optimizeDeps: { include: browserOptimizedDeps },
				test: {
					name: 'browser',
					include: ['src/**/*.test.browser.ts'],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
					},
				},
			},
			{
				test: {
					name: 'e2e',
					include: ['test/e2e/**/*.e2e.ts'],
					environment: 'node',
					globalSetup: ['./test/e2e/global-setup.ts'],
					hookTimeout: 180_000,
					testTimeout: 60_000,
				},
			},
		],
	},
});
