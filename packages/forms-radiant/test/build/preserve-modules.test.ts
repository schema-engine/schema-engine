import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildLib } from '@schema-engine/scripts/esbuild-lib';
import { afterEach, expect, test } from 'vitest';

const folders: string[] = [];
const stops: Array<() => Promise<void>> = [];

afterEach(async () => {
	for (const stop of stops.splice(0)) await stop();
	for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
	const cwd = mkdtempSync(path.join(tmpdir(), 'preserve-modules-'));
	folders.push(cwd);
	for (const [file, text] of Object.entries(files)) {
		mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
		writeFileSync(path.join(cwd, file), text);
	}
	return cwd;
}

test('a build emits one file per source module and keeps imports between them relative', async () => {
	const cwd = project({
		'src/entry.ts': `import { helper } from './lib/helper.js';\nexport const value = helper();\n`,
		'src/lib/helper.ts': `export const helper = () => 1;\n`,
		'src/lib/unreached.ts': `export const unreached = 2;\n`,
	});

	await buildLib({ cwd, entryGlobs: ['src/entry.ts'], preserveModules: true });

	expect(readFileSync(path.join(cwd, 'dist/entry.js'), 'utf8')).toContain(`from "./lib/helper.js"`);
	expect(existsSync(path.join(cwd, 'dist/lib/helper.js'))).toBe(true);
	expect(existsSync(path.join(cwd, 'dist/lib/unreached.js'))).toBe(true);
});

test('a watch build emits a helper that an existing module starts to import', async () => {
	const cwd = project({
		'src/entry.ts': `export const value = 1;\n`,
	});
	let builds = 0;
	let onBuild: () => void = () => {};
	const handle = await buildLib({
		cwd,
		entryGlobs: ['src/entry.ts'],
		preserveModules: true,
		watch: true,
		onEnd: () => {
			builds += 1;
			onBuild();
		},
	});
	stops.push(async () => handle?.stop());
	const built = (count: number) =>
		new Promise<void>((resolve) => {
			onBuild = () => {
				if (builds >= count && existsSync(path.join(cwd, 'dist/added.js'))) resolve();
			};
		});

	const emitted = built(2);
	writeFileSync(path.join(cwd, 'src/added.ts'), `export const added = 2;\n`);
	writeFileSync(path.join(cwd, 'src/entry.ts'), `import { added } from './added.js';\nexport const value = added;\n`);
	await emitted;

	expect(readFileSync(path.join(cwd, 'dist/entry.js'), 'utf8')).toContain(`from "./added.js"`);
});
