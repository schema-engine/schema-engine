import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import nested from 'postcss-nested';
import tailwindcss from '@tailwindcss/postcss';
import { buildLib } from '@schema-engine/scripts/esbuild-lib';

const cwd = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(cwd, 'dist');

const entryDirs = ['src/components', 'src/contexts', 'src/hooks', 'src/types'];

const postcssPlugin = {
	name: 'postcss',
	setup(build) {
		build.onLoad({ filter: /\.css$/ }, async (args) => {
			const source = readFileSync(args.path, 'utf8');
			const globalCss = path.join(cwd, 'src/styles/global.css');
			const isGlobal = path.resolve(args.path) === path.resolve(globalCss);
			const css = isGlobal ? source : `@reference "${globalCss}";\n${source}`;
			const result = await postcss([nested, tailwindcss, autoprefixer]).process(css, { from: args.path });
			return { contents: result.css, loader: 'css' };
		});
	},
};

if (existsSync(outputDir) && !process.argv.includes('--watch')) {
	rmSync(outputDir, { recursive: true, force: true });
}

await buildLib({
	cwd,
	entryGlobs: [
		'src/index.ts',
		'src/*.ts',
		'src/*.tsx',
		...entryDirs.flatMap((dir) => [`${dir}/**/*.ts`, `${dir}/**/*.tsx`]),
	],
	exclude: ['.stories.', '.play.', '.test.'],
	plugins: [postcssPlugin],
});
