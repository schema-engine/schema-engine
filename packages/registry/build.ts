import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLib } from '@schema-engine/scripts/esbuild-lib';

const cwd = path.dirname(fileURLToPath(import.meta.url));

await buildLib({
	cwd,
	entryGlobs: ['src/**/*.ts'],
	minify: !process.argv.includes('--watch'),
});
