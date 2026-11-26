import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserProjectLimits } from '../../scripts/vitest-browser-limits.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const formsPackageRoot = path.resolve(dirname, '../forms/src');

/**
 * Where a primitive the Base UI port overrides is read from, as the registry's own catalog selects it.
 *
 * @remarks
 * `registry/shared/primitives` holds the shared implementations, and `registry/base-ui/primitives` the ones the
 * default (Base UI) port replaces, so a test that renders the registry's combobox or number field resolves them
 * from there, as the Storybook project does.
 */
const baseUiPrimitives = ['combobox', 'number-field'].map((name) => ({
	find: `@/components/ui/schema-engine/components/${name}`,
	replacement: path.resolve(dirname, `../../registry/base-ui/primitives/${name}.tsx`),
}));

const alias = [
	...baseUiPrimitives,
	{
		find: '@/components/ui/schema-engine/components',
		replacement: path.resolve(dirname, '../../registry/shared/primitives'),
	},
	{
		find: '@/components/schema-engine/forms',
		replacement: path.resolve(dirname, '../../registry/shared/forms'),
	},
	{
		find: /^@schema-engine\/forms\/lib\/logger$/,
		replacement: `${formsPackageRoot}/lib/logger.ts`,
	},
	{
		find: /^@schema-engine\/forms\/lib\/normalized-form-config$/,
		replacement: `${formsPackageRoot}/lib/normalized-form-config.ts`,
	},
	{
		find: '@/components/ui',
		replacement: path.resolve(dirname, '../../registry/ui-stubs'),
	},
	{ find: '@/lib/utils', replacement: path.resolve(dirname, '../../registry/ui-stubs/lib/utils.ts') },
	{ find: '@', replacement: path.resolve(dirname, 'src') },
	{ find: /^@schema-engine\/forms-react$/, replacement: path.resolve(dirname, 'src/index.ts') },
	{
		find: /^@schema-engine\/forms-react\/(.*)$/,
		replacement: `${path.resolve(dirname, 'src')}/$1`,
	},
];

/**
 * Dependencies the browser and storybook projects pre-bundle before any test or story runs.
 *
 * @remarks
 * A dependency first reached by a test or a story is otherwise optimized mid-run, and Vite then reloads the page,
 * which fails whatever was loading ("Vite unexpectedly reloaded a test"). Listing what the registry controls import
 * keeps the first optimization complete. The browser project has its own `cacheDir`, so it keeps it warm for the next
 * run; the Storybook plugin sets the storybook project's (`node_modules/.cache/storybook/<id>/sb-vitest`).
 */
const optimizedDeps = [
	'@base-ui/react',
	'@base-ui/react/button',
	'@base-ui/react/checkbox',
	'@base-ui/react/dialog',
	'@base-ui/react/input',
	'@base-ui/react/merge-props',
	'@base-ui/react/number-field',
	'@base-ui/react/popover',
	'@base-ui/react/radio',
	'@base-ui/react/radio-group',
	'@base-ui/react/scroll-area',
	'@base-ui/react/select',
	'@base-ui/react/separator',
	'@base-ui/react/slider',
	'@base-ui/react/switch',
	'@base-ui/react/use-render',
	'@ecopages/logger',
	'class-variance-authority',
	'clsx',
	'cmdk',
	'date-fns',
	'imask',
	'input-otp',
	'libphonenumber-js/min',
	'lucide-react',
	'react',
	'react-day-picker',
	'react-dom',
	'react-dom/client',
	'react-dropzone',
	'react-phone-number-input',
	'react-phone-number-input/flags',
	'react/jsx-dev-runtime',
	'react/jsx-runtime',
	'storybook/test',
	'tailwind-merge',
	'zod/mini',
];

export default defineConfig({
	resolve: { alias },
	test: {
		projects: [
			{
				plugins: [react()],
				resolve: { alias },
				test: {
					name: 'unit',
					environment: 'node',
					testTimeout: 30_000,
					include: ['test/**/*.test.ts'],
					exclude: ['test/form-state/action-context.test.ts'],
				},
			},
			{
				plugins: [react()],
				resolve: { alias },
				cacheDir: path.join(dirname, 'node_modules/.vite-browser'),
				optimizeDeps: { include: optimizedDeps },
				test: {
					name: 'browser',
					...browserProjectLimits(1),
					include: [
						'test/**/*.test.tsx',
						'test/**/*.browser.test.tsx',
						'test/form-state/action-context.test.ts',
						'src/stories/**/*.test.{ts,tsx}',
						'**/*.test-browser.{ts,tsx}',
					],
					setupFiles: ['./vitest.setup.ts'],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
					},
				},
			},
			{
				plugins: [react(), storybookTest({ configDir: path.join(dirname, '.storybook') })],
				resolve: { alias },
				optimizeDeps: { include: optimizedDeps },
				test: {
					name: 'storybook',
					...browserProjectLimits(2),
					setupFiles: ['./.storybook/vitest.setup.ts'],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
						viewport: { width: 1280, height: 720 },
					},
				},
			},
		],
	},
});
