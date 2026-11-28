import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { entryExportNames } from '../../../../test-utils/entry-exports';
import {
	bundlePublishedEntry,
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

describe('a consumer of the published package', () => {
	test.each(scriptEntryKeys(packageDir))('imports %s and gets the names the source entry exports', (key) => {
		expect(consumerImport(packageDir, specifierOf(packageDir, key))).toEqual({
			exports: entryExportNames(packageDir, key, 'values'),
		});
	});

	test.each(['/contexts', '/components/form-debugger', '/global.css'])(
		'is refused the removed entry %s',
		(subpath) => {
			expect(consumerImport(packageDir, `@schema-engine/forms-react${subpath}`)).toEqual({
				error: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
			});
		},
	);

	test('resolves the debugger stylesheet to a file and not the old global stylesheet', () => {
		const resolved = consumerResolve(packageDir, '@schema-engine/forms-react/debugger.css').exports?.[0];
		expect(resolved).toBeDefined();
		expect(existsSync(fileURLToPath(resolved!))).toBe(true);
		expect(consumerResolve(packageDir, '@schema-engine/forms-react/global.css')).toEqual({
			error: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
		});
	});

	test('bundles the debugger only when it imports the debugger entry', async () => {
		const root = await bundlePublishedEntry(packageDir, `export * from '@schema-engine/forms-react';`);
		const debug = await bundlePublishedEntry(packageDir, `export * from '@schema-engine/forms-react/debugger';`);
		expect(root.code).not.toContain('form-debugger');
		expect(debug.code).toContain('form-debugger');
	});
});
