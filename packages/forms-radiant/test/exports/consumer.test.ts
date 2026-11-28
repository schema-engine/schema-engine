import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { entryExportNames } from '../../../../test-utils/entry-exports';
import {
	bundlePublishedEntry,
	bundlePublishedStyles,
	consumerImport,
	consumerResolve,
	scriptEntryKeys,
	specifierOf,
} from '../../../../test-utils/renderer-entries';

/**
 * Reads the published package the way an app does: through its `exports` map, in a fresh process, with no tsconfig
 * `paths` and no vitest alias. It needs `dist`, which `build:lib` writes before the tests run.
 */
const packageDir = path.resolve(import.meta.dirname, '../..');
const SERVER_BOOT = '@ecopages/radiant/server/install-ssr-runtime';

/** The custom elements of the built-in shells and blocks, which only the built-in recipes load. */
const BUILT_IN_RECIPE_TAGS = [
	'se-step-header',
	'se-step-indicators',
	'se-wizard-actions',
	'se-form-actions',
	'se-minimal-progress',
	'se-split-screen-side',
];

describe('a consumer of the published package', () => {
	test.each(scriptEntryKeys(packageDir))(
		'imports %s on a server after the boot import and gets the names the source entry exports',
		(key) => {
			expect(consumerImport(packageDir, specifierOf(packageDir, key), { bootstrap: SERVER_BOOT })).toEqual({
				exports: entryExportNames(packageDir, key, 'values'),
			});
		},
	);

	test.each(['/hooks', '/contexts', '/components/form-debugger'])('is refused the removed entry %s', (subpath) => {
		expect(
			consumerImport(packageDir, `@schema-engine/forms-radiant${subpath}`, { bootstrap: SERVER_BOOT }),
		).toEqual({ error: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
	});

	test.each(['index.css', 'debugger.css'])('resolves %s to a file', (stylesheet) => {
		const resolved = consumerResolve(packageDir, `@schema-engine/forms-radiant/${stylesheet}`).exports?.[0];
		expect(resolved).toBeDefined();
		expect(existsSync(fileURLToPath(resolved!))).toBe(true);
	});
});

describe('a bundle of the published package', () => {
	test('reads the built dist, not the source the tsconfig paths map the package name to', async () => {
		const script = await bundlePublishedEntry(
			packageDir,
			`export * from '@schema-engine/forms-radiant/primitives';`,
		);
		const styles = await bundlePublishedStyles(packageDir, `@import '@schema-engine/forms-radiant/index.css';`);
		for (const { inputs } of [script, styles]) {
			expect(inputs.length).toBeGreaterThan(0);
			expect(inputs.filter((file) => !file.startsWith('dist/'))).toEqual([]);
		}
	});

	test('binding a recipe loads no built-in shell or block, no debugger and no input host', async () => {
		const bundle = await bundlePublishedEntry(
			packageDir,
			`import { defineRecipe } from '@schema-engine/forms-radiant/primitives'; console.log(defineRecipe);`,
		);
		for (const tag of [...BUILT_IN_RECIPE_TAGS, 'se-form-debugger', 'se-phone-input']) {
			expect(bundle.code, tag).not.toContain(tag);
		}
	});

	test('the built-in recipes do hold their blocks, so the check above can fail', async () => {
		const bundle = await bundlePublishedEntry(
			packageDir,
			`import { radiantRecipes } from '@schema-engine/forms-radiant'; console.log(radiantRecipes);`,
		);
		for (const tag of BUILT_IN_RECIPE_TAGS) expect(bundle.code, tag).toContain(tag);
	});

	test('everything the root exports holds no debugger', async () => {
		const bundle = await bundlePublishedEntry(packageDir, `export * from '@schema-engine/forms-radiant';`);
		expect(bundle.code).toContain('se-phone-input');
		expect(bundle.code).not.toContain('se-form-debugger');
	});

	test('the debugger entry holds the debugger', async () => {
		const bundle = await bundlePublishedEntry(packageDir, `export * from '@schema-engine/forms-radiant/debugger';`);
		expect(bundle.code).toContain('se-form-debugger');
	});

	test('index.css holds no debugger rule and debugger.css holds it', async () => {
		const app = await bundlePublishedStyles(packageDir, `@import '@schema-engine/forms-radiant/index.css';`);
		const debug = await bundlePublishedStyles(packageDir, `@import '@schema-engine/forms-radiant/debugger.css';`);
		expect(app.code).not.toContain('.se-form-debugger');
		expect(debug.code).toContain('.se-form-debugger');
	});
});
