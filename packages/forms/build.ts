import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLib } from '../../scripts/esbuild-lib.ts';

const cwd = path.dirname(fileURLToPath(import.meta.url));

await buildLib({
	cwd,
	entryGlobs: ['src/**/*.ts'],
	aliases: [{ prefix: '@', dir: path.join(cwd, 'src') }],
	external: ['@schema-engine/actions', '@schema-engine/registry', 'zod/mini'],
	/**
	 * Keep shared modules (especially the validation registry singleton) as one
	 * runtime instance across package entry points.
	 */
	splitting: true,
});
