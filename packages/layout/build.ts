import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLib } from '@schema-engine/scripts/esbuild-lib';

const cwd = path.dirname(fileURLToPath(import.meta.url));

await buildLib({
	cwd,
	entryGlobs: ['src/**/*.ts'],
	aliases: [{ prefix: '@', dir: path.join(cwd, 'src') }],
	external: ['@schema-engine/registry', 'zod/mini'],
	minify: !process.argv.includes('--watch'),
});
