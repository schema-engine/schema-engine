import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'esbuild';
import { buildLib } from '@schema-engine/scripts/esbuild-lib';

const cwd = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(cwd, 'dist');

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
	entryGlobs: ['src/index.css', 'src/debugger.css'],
	exclude: ['.stories.', '.play.', '.test.', '.d.ts', '/stories/'],
	plugins: [cssStubPlugin()],
	preserveModules: true,
});
