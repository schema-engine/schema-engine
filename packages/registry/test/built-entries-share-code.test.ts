import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { modulesBundledTwice } from '../../../test-utils/built-entries';

test('no module is bundled into two files of dist, so every entry shares one copy of its classes and brands', () => {
	expect(modulesBundledTwice(path.resolve(import.meta.dirname, '..'))).toEqual([]);
});

describe('the check that no module is bundled twice', () => {
	const folders: string[] = [];
	afterEach(() => {
		for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
	});

	/** A package folder whose `dist` holds the scripts given, each with a source map of the sources given. */
	function packageWith(built: Record<string, string[] | null>): string {
		const folder = mkdtempSync(path.join(tmpdir(), 'built-entries-'));
		folders.push(folder);
		mkdirSync(path.join(folder, 'dist'));
		for (const [script, sources] of Object.entries(built)) {
			writeFileSync(path.join(folder, 'dist', script), '');
			if (sources) {
				writeFileSync(path.join(folder, 'dist', `${script}.map`), JSON.stringify({ sources }));
			}
		}
		return folder;
	}

	test('names a module that two files contain', () => {
		const folder = packageWith({ 'a.js': ['../src/error.ts'], 'b.js': ['../src/error.ts', '../src/b.ts'] });

		expect(modulesBundledTwice(folder)).toEqual([{ source: 'src/error.ts', files: ['a.js.map', 'b.js.map'] }]);
	});

	test('passes for modules that each sit in one file', () => {
		const folder = packageWith({ 'a.js': ['../src/a.ts'], 'chunk.js': ['../src/error.ts'] });

		expect(modulesBundledTwice(folder)).toEqual([]);
	});

	test('throws for a script without a source map instead of passing it unread', () => {
		const folder = packageWith({ 'a.js': null });

		expect(() => modulesBundledTwice(folder)).toThrow('a.js has no source map');
	});

	test('throws for a dist with no script', () => {
		const folder = packageWith({});

		expect(() => modulesBundledTwice(folder)).toThrow('holds no script');
	});
});
