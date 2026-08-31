import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const alias = [
	{
		find: '@/components/ui/schema-engine/components',
		replacement: path.resolve(dirname, '../../registry/shared/primitives'),
	},
	{
		find: '@/components/schema-engine/forms',
		replacement: path.resolve(dirname, '../../registry/shared/forms'),
	},
	{
		find: '@/components/ui',
		replacement: path.resolve(dirname, '../../registry/ui-stubs'),
	},
	{ find: '@', replacement: path.resolve(dirname, 'src') },
	{ find: /^@schema-engine\/forms-react$/, replacement: path.resolve(dirname, 'src/index.ts') },
	{
		find: /^@schema-engine\/forms-react\/(.*)$/,
		replacement: `${path.resolve(dirname, 'src')}/$1`,
	},
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
					exclude: ['test/adapters/action-context.test.ts'],
				},
			},
			{
				plugins: [react()],
				resolve: { alias },
				test: {
					name: 'browser',
					include: [
						'test/**/*.test.tsx',
						'test/adapters/action-context.test.ts',
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
		],
	},
});
