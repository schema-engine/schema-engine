import { $ } from 'bun';
import { watch } from 'node:fs';
import path from 'node:path';
import { Logger } from '@ecopages/logger';

const logger = new Logger('[@schema-engine/actions]');

const watchMode = process.argv.includes('--watch');

const build = await Bun.build({
	// Single browser bundle — Bun breaks named re-export barrels across multi-entry builds.
	entrypoints: ['src/index.ts'],
	outdir: 'dist',
	root: './src',
	target: 'browser',
	minify: !watchMode,
	format: 'esm',
	splitting: false,
	sourcemap: 'external',
	external: ['@schema-engine/registry', 'zod'],
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
		await $`bun run build:lib`;
	});

	process.on('SIGINT', () => {
		logger.info('Closing watcher...');
		watcher.close();
		process.exit(0);
	});
}
