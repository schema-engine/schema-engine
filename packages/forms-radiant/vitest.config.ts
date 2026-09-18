import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const alias = [
	{
		find: '@/registry/forms',
		replacement: path.resolve(dirname, '../../registry/shared/forms'),
	},
	{ find: /^@schema-engine\/forms-radiant$/, replacement: path.resolve(dirname, 'src/index.ts') },
	{
		find: /^@schema-engine\/forms-radiant\/(.*)$/,
		replacement: `${path.resolve(dirname, 'src')}/$1`,
	},
	{ find: '@', replacement: path.resolve(dirname, 'src') },
];

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
					setupFiles: ['./vitest.setup.ts'],
				},
			},
			{
				resolve: { alias },
				test: {
					name: 'browser',
					include: ['test/**/*.browser.test.ts'],
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
