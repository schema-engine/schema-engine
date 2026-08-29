import { defineConfig, type Plugin } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** Registry files live outside this package; resolve workspace exports from here. */
function resolveWorkspaceFromPackage(): Plugin {
	return {
		name: 'resolve-workspace-from-forms-react',
		enforce: 'pre',
		resolveId(id) {
			if (id.startsWith('@schema-engine/forms-react')) {
				return null;
			}

			if (!id.startsWith('@schema-engine/forms') && !id.startsWith('@schema-engine/actions')) {
				return null;
			}

			const parents = [import.meta.url, pathToFileURL(path.resolve(dirname, '../forms/package.json')).href];

			for (const parent of parents) {
				try {
					return fileURLToPath(import.meta.resolve(id, parent));
				} catch {
					// try the next resolution parent
				}
			}

			return null;
		},
	};
}

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

const workspaceResolve = resolveWorkspaceFromPackage();

export default defineConfig({
	plugins: [workspaceResolve],
	resolve: { alias },
	test: {
		projects: [
			{
				plugins: [workspaceResolve],
				resolve: { alias },
				test: {
					name: 'unit',
					environment: 'node',
					include: ['test/**/*.test.ts'],
					exclude: ['test/adapters/action-context.test.ts'],
				},
			},
			{
				plugins: [react(), workspaceResolve],
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
