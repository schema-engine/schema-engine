import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const alias = [
	{ find: '@', replacement: path.resolve(dirname, 'src') },
	{ find: /^@schema-engine\/forms-radiant$/, replacement: path.resolve(dirname, 'src/index.ts') },
	{
		find: /^@schema-engine\/forms-radiant\/(.*)$/,
		replacement: `${path.resolve(dirname, 'src')}/$1`,
	},
	{ find: /^@\/registry\/forms/, replacement: path.resolve(dirname, '../../registry/shared/forms') },
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
					setupFiles: ['./vitest.setup.ts'],
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
