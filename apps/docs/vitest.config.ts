import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

const dirname = path.dirname(fileURLToPath(import.meta.url));

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
					include: ['test/**/*.test.ts'],
					environment: 'node',
					setupFiles: ['./test/unit-setup.ts'],
				},
			},
			{
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
