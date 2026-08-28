import type { StorybookConfig } from '@ecopages/storybook-radiant-vite/node';
import { formsRadiantAliases } from './aliases.ts';

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
	addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
	framework: {
		name: '@ecopages/storybook-radiant-vite',
		options: {
			globalStyleModules: ['./.storybook/preview.css'],
		},
	},
	async viteFinal(viteConfig) {
		viteConfig.resolve ??= {};
		const existing = viteConfig.resolve.alias;
		viteConfig.resolve.alias = [...formsRadiantAliases, ...(Array.isArray(existing) ? existing : [])];
		return viteConfig;
	},
};

export default config;
