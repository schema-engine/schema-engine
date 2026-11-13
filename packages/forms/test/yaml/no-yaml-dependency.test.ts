import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { expect, test } from 'vitest';

const formsEntry = resolve(import.meta.dirname, '../../dist/index.js');

/**
 * An app that uses forms and never imports `@schema-engine/registry/yaml` must build and run with
 * no `yaml` installed. The plugin makes any import of `yaml` an error, which is what an app without
 * the optional peer dependency would see.
 */
test('an app using only forms builds and runs without yaml', async () => {
	const result = await build({
		stdin: {
			contents: `
				import { createFormEngine } from ${JSON.stringify(formsEntry)};
				export const result = createFormEngine().safeValidateForm({ id: 'x', steps: [] });
			`,
			resolveDir: resolve(import.meta.dirname, '../..'),
			sourcefile: 'app.ts',
		},
		bundle: true,
		write: false,
		format: 'esm',
		platform: 'node',
		logLevel: 'silent',
		plugins: [
			{
				name: 'no-yaml',
				setup(api) {
					api.onResolve({ filter: /^yaml(\/|$)/ }, (args) => ({
						errors: [{ text: `The app imported ${args.path}, which it does not install` }],
					}));
				},
			},
		],
	});

	const output = result.outputFiles[0]?.text ?? '';
	expect(output).not.toMatch(/LineCounter|parseDocument/);

	const directory = mkdtempSync(join(tmpdir(), 'forms-no-yaml-'));
	try {
		const file = join(directory, 'app.mjs');
		writeFileSync(file, output);
		const app = (await import(pathToFileURL(file).href)) as { result: { success: boolean } };
		expect(app.result).toHaveProperty('success');
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
