import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { radiant } from '@ecopages/vite-plugin-radiant';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const formsPackageRoot = path.resolve(dirname, '../forms/src');

const alias = [
	{
		find: /^@schema-engine\/forms\/adapters(\/.*)?$/,
		replacement: `${formsPackageRoot}/adapters$1`,
	},
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
				test: {
					name: 'browser',
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
