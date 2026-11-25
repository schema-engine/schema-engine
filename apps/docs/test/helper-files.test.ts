import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { guideHelpers, importSpecifier, isHelperFile, splitSources, unusedHelpers } from './helper-files';
import { titledRunner } from './snippet-harness';

describe('helper files', () => {
	test('a helper has .helper before its extension, with or without .react', () => {
		for (const name of ['i18n.helper.ts', 'widgets.helper.react.tsx', 'a.b.helper.tsx']) {
			expect(isHelperFile(name), name).toBe(true);
		}
		for (const name of ['helper.ts', 'helpers.ts', 'i18n.helper.test.ts', 'widgets.react.tsx', 'x.helper.css']) {
			expect(isHelperFile(name), name).toBe(false);
		}
	});

	test('a folder splits into the files to show and the helpers; tests are neither', () => {
		expect(
			splitSources(['b.ts', 'a.ts', 'i18n.helper.ts', 'a.test.ts', 'a.test.browser.ts', 'view.react.tsx']),
		).toEqual({ shown: ['a.ts', 'b.ts', 'view.react.tsx'], helpers: ['i18n.helper.ts'] });
	});

	test('an unshown file that is not a helper stays on the list of files to show', () => {
		expect(splitSources(['main.ts', 'hidden.ts']).shown).toContain('hidden.ts');
	});

	test('a helper nothing imports is reported, and the import names the file without its last extension', () => {
		expect(importSpecifier('widgets.helper.react.tsx')).toBe('./widgets.helper.react');
		expect(unusedHelpers(['i18n.helper.ts', 'dead.helper.ts'], ['./i18n.helper', 'zod'])).toEqual([
			'dead.helper.ts',
		]);
	});

	test('a page can import a helper it does not show, and not a file that is not a helper', () => {
		const root = mkdtempSync(join(tmpdir(), 'helpers-'));
		try {
			writeFileSync(join(root, 'clock.helper.ts'), 'export const now = () => 42;\n');
			writeFileSync(join(root, 'shown.ts'), 'export const shown = 1;\n');
			const helpers = guideHelpers(root);
			expect(Object.keys(helpers)).toEqual(['clock.helper.ts']);
			const runner = titledRunner([], {}, {}, helpers);
			expect((runner.load('clock.helper.ts') as { now: () => number }).now()).toBe(42);
			expect(() => runner.load('shown.ts')).toThrow('has no file titled shown.ts');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
