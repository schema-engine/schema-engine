// This file has been automatically migrated to valid ESM format by Storybook.
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import type { StorybookConfig } from '@storybook/react-vite';
import { join, dirname, resolve } from 'path';

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
		getAbsolutePath('msw-storybook-addon'),
	],
	framework: {
		name: getAbsolutePath('@storybook/react-vite'),
		options: {},
	},
	staticDirs: ['../public'],
	async viteFinal(config) {
		return {
			...config,
			resolve: {
				...config.resolve,
				alias: Object.assign({}, config.resolve?.alias ?? {}, {
					'@': resolve(__dirname, '../src'),
				}),
			},
		};
	},
};
export default config;
