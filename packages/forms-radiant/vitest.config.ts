import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserProjectLimits } from '../../scripts/vitest-browser-limits.ts';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { radiant } from '@ecopages/vite-plugin-radiant';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const alias = [
	{ find: /^@schema-engine\/forms-radiant$/, replacement: path.resolve(dirname, 'src/index.ts') },
	{
		find: /^@schema-engine\/forms-radiant\/(.*)$/,
		replacement: `${path.resolve(dirname, 'src')}/$1`,
	},
	{ find: '@', replacement: path.resolve(dirname, 'src') },
];

/**
 * Radiant JSX plus TC39 decorator lowering, so tests can import the renderer
 * components (custom-element hosts included) instead of re-deriving their markup.
 *
 * @remarks
 * Vite 8 transforms with oxc and ignores `esbuild` options; oxc lowers only
 * legacy `experimentalDecorators`, which this package does not use. Babel
 * lowering is the plugin's documented route until oxc supports ECMA decorators
 * ([oxc#9170](https://github.com/oxc-project/oxc/issues/9170)).
 */
const radiantPlugins = await radiant({ jsxImportSource: '@ecopages/jsx', decorators: 'babel' });

/**
 * Dependencies the browser project pre-bundles before any test runs.
 *
 * @remarks
 * On a cold Vite cache, a dependency first reached through a dynamic import or
 * a lazily loaded element is optimized mid-run, and Vite reloads the page
 * ("Vite unexpectedly reloaded a test"). Listing every Radiant UI entry the
 * renderer imports, plus the input libraries it loads lazily, keeps the first
 * optimization complete.
 */
const browserOptimizedDeps = [
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
];

export default defineConfig({
	resolve: { alias },
	test: {
		projects: [
			{
				plugins: radiantPlugins,
				resolve: { alias },
				test: {
					name: 'unit',
					environment: 'node',
					include: ['test/**/*.test.ts'],
					exclude: ['test/**/*.browser.test.ts'],
					setupFiles: ['./vitest.setup.ts'],
				},
			},
			{
				plugins: radiantPlugins,
				resolve: { alias },
				optimizeDeps: { include: browserOptimizedDeps },
				test: {
					name: 'browser',
					...browserProjectLimits(1),
					include: ['test/**/*.browser.test.ts'],
					globalSetup: ['./test/ssr/ssr-html.global-setup.ts'],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
					},
				},
			},
			{
				extends: true,
				resolve: { alias },
				plugins: [
					storybookTest({
						configDir: path.join(dirname, '.storybook'),
						storybookScript: 'pnpm storybook --no-open',
					}),
				],
				test: {
					name: 'storybook',
					...browserProjectLimits(2),
					setupFiles: ['./.storybook/vitest.setup.ts'],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
					},
				},
			},
		],
	},
});
