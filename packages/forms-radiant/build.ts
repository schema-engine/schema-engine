import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLib } from '../../scripts/esbuild-lib.ts';

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

if (existsSync(outputDir) && !process.argv.includes('--watch')) {
	rmSync(outputDir, { recursive: true, force: true });
}

mkdirSync(outputDir, { recursive: true });

await buildLib({
	cwd,
	entryGlobs: [
		'src/index.ts',
		'src/primitives.ts',
		'src/*.ts',
		'src/*.tsx',
		...entryDirs.flatMap((dir) => [`${dir}/**/*.ts`, `${dir}/**/*.tsx`]),
	],
	exclude: ['.stories.', '.play.', '.test.'],
	splitting: true,
	aliases: [{ prefix: '@', dir: path.join(cwd, 'src') }],
	external: [
		'@schema-engine/forms',
		'@ecopages/jsx',
		'@ecopages/jsx/jsx-runtime',
		'@ecopages/radiant',
		'@ecopages/radiant/context',
		'@ecopages/radiant-ui',
		'@ecopages/radiant-ui/radiant-ui-core.css',
		'@ecopages/radiant-ui/alert',
		'@ecopages/radiant-ui/alert/styles.css',
		'@ecopages/radiant-ui/autocomplete',
		'@ecopages/radiant-ui/autocomplete/styles.css',
		'@ecopages/radiant-ui/button',
		'@ecopages/radiant-ui/button/styles.css',
		'@ecopages/radiant-ui/checkbox',
		'@ecopages/radiant-ui/checkbox/styles.css',
		'@ecopages/radiant-ui/checkbox-group',
		'@ecopages/radiant-ui/checkbox-group/styles.css',
		'@ecopages/radiant-ui/combobox',
		'@ecopages/radiant-ui/combobox/styles.css',
		'@ecopages/radiant-ui/field',
		'@ecopages/radiant-ui/field/styles.css',
		'@ecopages/radiant-ui/form',
		'@ecopages/radiant-ui/form/styles.css',
		'@ecopages/radiant-ui/heading',
		'@ecopages/radiant-ui/heading/styles.css',
		'@ecopages/radiant-ui/headline',
		'@ecopages/radiant-ui/headline/styles.css',
		'@ecopages/radiant-ui/input',
		'@ecopages/radiant-ui/input/styles.css',
		'@ecopages/radiant-ui/label',
		'@ecopages/radiant-ui/label/styles.css',
		'@ecopages/radiant-ui/listbox',
		'@ecopages/radiant-ui/listbox/styles.css',
		'@ecopages/radiant-ui/number-field',
		'@ecopages/radiant-ui/number-field/styles.css',
		'@ecopages/radiant-ui/radio-group',
		'@ecopages/radiant-ui/radio-group/styles.css',
		'@ecopages/radiant-ui/select',
		'@ecopages/radiant-ui/select/styles.css',
		'@ecopages/radiant-ui/slider',
		'@ecopages/radiant-ui/slider/styles.css',
		'@ecopages/radiant-ui/switch',
		'@ecopages/radiant-ui/switch/styles.css',
		'@ecopages/radiant-ui/tag-group',
		'@ecopages/radiant-ui/tag-group/styles.css',
		'@ecopages/radiant-ui/textarea',
		'@ecopages/radiant-ui/textarea/styles.css',
		'@ecopages/signals',
		'@ecopages/logger',
		'zod',
	],
});
