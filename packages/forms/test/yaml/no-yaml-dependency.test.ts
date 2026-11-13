import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { expect, test } from 'vitest';

const packageDirectory = resolve(import.meta.dirname, '../..');
const sourceDirectory = join(packageDirectory, 'src');

/**
 * An app that uses forms and never imports `@schema-engine/registry/yaml` must build and run with
 * no `yaml` installed. The plugin makes any import of `yaml` an error, which is what an app without
 * the optional peer dependency would see.
 *
 * @remarks
 * Bundles forms from source, resolving its `@/` alias, so the test does not depend on forms' own
 * `dist`, which `build:lib` removes while the package tests run.
 */
test('an app using only forms builds and runs without yaml', async () => {
	const result = await build({
		stdin: {
			contents: `
				import { createFormEngine } from ${JSON.stringify(join(sourceDirectory, 'index.ts'))};
				export const result = createFormEngine().safeValidateForm({ id: 'x', steps: [] });
			`,
			resolveDir: packageDirectory,
			sourcefile: 'app.ts',
		},
		bundle: true,
		write: false,
		format: 'esm',
		platform: 'node',
		logLevel: 'silent',
		plugins: [
			{
				name: 'forms-source-alias',
				setup(api) {
					api.onResolve({ filter: /^@\// }, (args) =>
						api.resolve(`./${args.path.slice(2)}`, { resolveDir: sourceDirectory, kind: args.kind }),
					);
				},
			},
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
