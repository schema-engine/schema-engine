import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'esbuild';
import { buildLib } from '@schema-engine/scripts/esbuild-lib';

const cwd = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(cwd, 'dist');

const entryDirs = [
	'src/adapters',
	'src/components',
	'src/contexts',
	'src/elements',
	'src/hooks',
	'src/registries',
	'src/registrations',
	'src/lib',
];

/**
 * Drops CSS from the JS graph so Node can import the published package.
 * Hosts load first-party rules from `index.css`; Radiant UI styles stay in the app.
 */
function cssStubPlugin(): Plugin {
	return {
		name: 'css-stub',
		setup(buildApi) {
			buildApi.onResolve({ filter: /\.css$/ }, (args) => {
				if (args.kind === 'entry-point' || args.importer.endsWith('.css')) {
					return null;
				}
				return { path: args.path, namespace: 'css-stub' };
			});
			buildApi.onLoad({ filter: /.*/, namespace: 'css-stub' }, () => ({
				contents: '',
				loader: 'empty',
			}));
		},
	};
}

if (existsSync(outputDir) && !process.argv.includes('--watch')) {
	rmSync(outputDir, { recursive: true, force: true });
}

mkdirSync(outputDir, { recursive: true });

await buildLib({
	cwd,
	entryGlobs: [
		'src/index.ts',
		'src/index.css',
		'src/primitives.ts',
		'src/*.ts',
		'src/*.tsx',
		...entryDirs.flatMap((dir) => [`${dir}/**/*.ts`, `${dir}/**/*.tsx`]),
	],
	exclude: ['.stories.', '.play.', '.test.'],
	splitting: true,
	aliases: [{ prefix: '@', dir: path.join(cwd, 'src') }],
	plugins: [cssStubPlugin()],
	external: [
		'@schema-engine/forms',
		'@ecopages/jsx',
		'@ecopages/jsx/jsx-runtime',
		'@ecopages/radiant',
		'@ecopages/radiant/context',
		'@ecopages/radiant-ui',
		'@ecopages/radiant-ui/alert',
		'@ecopages/radiant-ui/autocomplete',
		'@ecopages/radiant-ui/button',
		'@ecopages/radiant-ui/checkbox',
		'@ecopages/radiant-ui/checkbox-group',
		'@ecopages/radiant-ui/combobox',
		'@ecopages/radiant-ui/field',
		'@ecopages/radiant-ui/form',
		'@ecopages/radiant-ui/heading',
		'@ecopages/radiant-ui/headline',
		'@ecopages/radiant-ui/input',
		'@ecopages/radiant-ui/label',
		'@ecopages/radiant-ui/listbox',
		'@ecopages/radiant-ui/number-field',
		'@ecopages/radiant-ui/radio-group',
		'@ecopages/radiant-ui/select',
		'@ecopages/radiant-ui/sidebar',
		'@ecopages/radiant-ui/slider',
		'@ecopages/radiant-ui/switch',
		'@ecopages/radiant-ui/tag-group',
		'@ecopages/radiant-ui/textarea',
		'@ecopages/signals',
		'@ecopages/logger',
		'imask',
		'libphonenumber-js',
		'country-flag-icons',
		'country-flag-icons/string/3x2',
		'zod/mini',
	],
});
