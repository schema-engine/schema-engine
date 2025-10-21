import type { StorybookConfig } from '@storybook/react-vite';
import { join, dirname, resolve } from 'path';

/**
* This function is used to resolve the absolute path of a package.
* It is needed in projects that use Yarn PnP or are set up within a monorepo.
*/
function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')))
}

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  addons: [
    getAbsolutePath('@storybook/addon-docs'),
    'msw-storybook-addon',
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {}
  },
  staticDirs: ['../public'],
  async viteFinal(config) {
    return {
      ...config,
      build: {
        ...config.build,
        rollupOptions: {
          output: {
            manualChunks: (id) => {
              if (id.includes('node_modules/@storybook')) return '@storybook-vendor';
              if (id.includes('node_modules/react')) return 'react-vendor';
              if (id.includes('node_modules')) return 'vendor';
            },
          },
        },
        chunkSizeWarningLimit: 1000,
      },
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@': resolve(__dirname, '../src'),
        },
      },
      esbuild: {
        ...config.esbuild,
        drop: ['console', 'debugger'],
      },
    };
  },
};
export default config;