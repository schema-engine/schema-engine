import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import type { StorybookConfig } from '@storybook/react-vite';
import { join, dirname, resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import { tailwindReferencePlugin } from './tailwind-reference-plugin.ts';
import { mergeConfig } from 'vite';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): any {
	return dirname(require.resolve(join(value, 'package.json')));
}

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
	addons: [
		getAbsolutePath('@storybook/addon-docs'),
		getAbsolutePath('@storybook/addon-vitest'),
		'msw-storybook-addon',
	],
	framework: {
		name: getAbsolutePath('@storybook/react-vite'),
		options: {},
	},
	staticDirs: ['../public'],
	async viteFinal(config) {
		return mergeConfig(config, {
			resolve: {
				dedupe: ['react', 'react-dom', 'react-hook-form'],
				alias: [
					{
						find: '@/components/ui/schema-engine',
						replacement: resolve(
							__dirname,
							'../../../registry/base-ui/schema-engine-form/components/ui/schema-engine',
						),
					},
					{
						find: '@/components/schema-engine/forms',
						replacement: resolve(__dirname, '../../../registry/shared/forms'),
					},
					{
						find: '@/components/ui',
						replacement: resolve(__dirname, '../../../apps/www/src/components/ui'),
					},
					{ find: '@schema-engine/forms-react', replacement: resolve(__dirname, '../src') },
					{ find: /^@schema-engine\/forms-react\/(.*)$/, replacement: `${resolve(__dirname, '../src')}/$1` },
					{ find: /^@\//, replacement: `${resolve(__dirname, '../src')}/` },
				],
			},
			plugins: [
				tailwindReferencePlugin({ globalCssPath: path.join(__dirname, '../src/styles/global.css') }),
				tailwindcss(),
			],
		});
	},
};
export default config;
