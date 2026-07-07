import { $ } from 'bun';
import { watch } from 'node:fs';
import path from 'node:path';
import { Logger } from '@ecopages/logger';

const logger = new Logger('[@schema-engine/forms]');

const entrypoints = [
	'src/index.ts',
	'src/actions/index.ts',
	'src/actions/plugins/index.ts',
	'src/builder/index.ts',
	'src/constraints/index.ts',
	'src/engine/index.ts',
	'src/layouts/index.ts',
	'src/lib/debounce.ts',
	'src/lib/standard-schema.ts',
	'src/registries/index.ts',
	'src/schemas/index.ts',
	'src/schemas/validation/index.ts',
	'src/schemas/validation/async/index.ts',
	'src/steppers/index.ts',
	'src/tools/index.ts',
	'src/types/index.ts',
];

const build = await Bun.build({
	entrypoints,
	outdir: 'dist',
	root: './src',
	target: 'browser',
	minify: false,
	format: 'esm',
	// Bun breaks minified named re-export barrels when code-splitting is enabled.
	splitting: false,
	sourcemap: 'external',
	external: ['@schema-engine/actions', '@schema-engine/registry', '@standard-schema/spec', 'zod'],
});

if (!build.success) {
	for (const log of build.logs) {
		logger.error(log);
	}
	process.exit(1);
}

if (process.argv.includes('--watch')) {
	logger.info('Watching for changes...');
	const watcher = watch(path.resolve(__dirname, 'src'), { recursive: true }, async () => {
		await $`bun run build:files`;
	});

	process.on('SIGINT', () => {
		logger.info('Closing watcher...');
		watcher.close();
		process.exit(0);
	});
}
