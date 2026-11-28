import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import {
	exportedSymbolNames,
	symbolsFromOtherPackages,
	symbolsSharedByEntries,
} from '../../../test-utils/entry-exports';

/**
 * Tests of the entry export checks run by the build gate.
 *
 * @remarks
 * A guard that passes when it cannot see what it guards is worse than none, so each case here is a way the guard
 * could pass vacuously. The fixtures are packages written to a scratch directory, since a broken package would fail
 * the type check of the repo if it lived in the test tree.
 */
const scratch = mkdtempSync(path.join(tmpdir(), 'entry-exports-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

let counter = 0;

/** Writes a package with the given manifest `exports` and source files, and returns its directory. */
function fixturePackage(exportsMap: unknown, sources: Record<string, string>): string {
	const dir = path.join(scratch, `package-${counter++}`);
	mkdirSync(path.join(dir, 'src'), { recursive: true });
	writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'fixture', exports: exportsMap }));
	writeFileSync(
		path.join(dir, 'tsconfig.json'),
		JSON.stringify({
			compilerOptions: {
				module: 'ESNext',
				moduleResolution: 'bundler',
				target: 'ES2022',
				strict: true,
				noEmit: true,
			},
			include: ['src'],
		}),
	);
	for (const [file, text] of Object.entries(sources)) writeFileSync(path.join(dir, 'src', file), text);
	const other = path.join(dir, 'node_modules', '@fixture', 'other');
	mkdirSync(other, { recursive: true });
	writeFileSync(path.join(other, 'package.json'), JSON.stringify({ name: '@fixture/other', types: './index.d.ts' }));
	writeFileSync(
		path.join(other, 'index.d.ts'),
		'export declare const owned: number;\nexport interface OtherType {\n\treadonly other: true;\n}\n',
	);
	return dir;
}

const index = { '.': { types: './dist/index.d.ts', import: './dist/index.js' } };

describe('symbolsFromOtherPackages', () => {
	test('is empty for a package that exports only what it declares', () => {
		const dir = fixturePackage(index, { 'index.ts': 'export const own = 1;\n' });
		expect(symbolsFromOtherPackages(dir)).toEqual([]);
	});

	test('lists a symbol another package declares, under the name an importer writes', () => {
		const dir = fixturePackage(index, { 'index.ts': "export { owned as renamed } from '@fixture/other';\n" });
		expect(symbolsFromOtherPackages(dir)).toHaveLength(1);
		expect(symbolsFromOtherPackages(dir)[0]).toContain('renamed');
	});

	test('fails for a named re-export from a module that does not resolve', () => {
		const dir = fixturePackage(index, { 'index.ts': "export { missing } from '@fixture/not-installed';\n" });
		expect(() => symbolsFromOtherPackages(dir)).toThrow(/not-installed/);
	});

	test('fails for a named re-export the module does not declare, as a stale sibling dist would', () => {
		const dir = fixturePackage(index, { 'index.ts': "export { notThere } from '@fixture/other';\n" });
		expect(() => symbolsFromOtherPackages(dir)).toThrow(/notThere/);
	});

	test('fails for a star re-export from a module that does not resolve', () => {
		const dir = fixturePackage(index, { 'index.ts': "export * from './gone';\nexport const own = 1;\n" });
		expect(() => symbolsFromOtherPackages(dir)).toThrow(/gone/);
	});

	test('fails for a star re-export in a file the entry reaches', () => {
		const dir = fixturePackage(index, {
			'index.ts': "export * from './inner';\n",
			'inner.ts': "export * from '@fixture/not-installed';\n",
		});
		expect(() => symbolsFromOtherPackages(dir)).toThrow(/not-installed/);
	});

	test('fails for an entry whose source file does not exist', () => {
		const dir = fixturePackage(index, {});
		expect(() => symbolsFromOtherPackages(dir)).toThrow(/index/);
	});

	test('reads an entry that is a string target', () => {
		const dir = fixturePackage({ '.': './dist/index.js' }, { 'index.ts': 'export const own = 1;\n' });
		expect(exportedSymbolNames(dir)).toEqual(['own']);
	});

	test.each([
		['a default condition', { '.': { default: './dist/index.js' } }],
		['a .mjs file', { '.': { import: './dist/index.mjs' } }],
		['a file outside dist', { '.': { import: './lib/index.js' } }],
		['nested conditions', { '.': { import: { default: './dist/index.js' } } }],
	])('throws for an exports entry the helper cannot map: %s', (_name, exportsMap) => {
		const dir = fixturePackage(exportsMap, { 'index.ts': 'export const own = 1;\n' });
		expect(() => symbolsFromOtherPackages(dir)).toThrow(/cannot map/i);
	});

	test('throws for a package that has no entry to read', () => {
		const dir = fixturePackage({ './package.json': './package.json', './index.css': './dist/index.css' }, {});
		expect(() => symbolsFromOtherPackages(dir)).toThrow(/no entry/i);
	});

	test('reads an entry that names only a declaration file', () => {
		const dir = fixturePackage(
			{ ...index, './types': { types: './dist/types.d.ts' } },
			{
				'index.ts': 'export const own = 1;\n',
				'types.ts': "export { missing } from '@fixture/not-installed';\n",
			},
		);
		expect(() => symbolsFromOtherPackages(dir)).toThrow(/not-installed/);
	});

	test('lists what a declaration-only entry exports', () => {
		const dir = fixturePackage(
			{ ...index, './types': { types: './dist/types.d.ts' } },
			{ 'index.ts': 'export const own = 1;\n', 'types.ts': "export type { OtherType } from '@fixture/other';\n" },
		);
		expect(symbolsFromOtherPackages(dir)).toEqual([expect.stringContaining('OtherType')]);
	});

	test('throws for a declaration-only entry the helper cannot map', () => {
		const dir = fixturePackage(
			{ ...index, './types': { types: './lib/types.d.ts' } },
			{ 'index.ts': 'export const own = 1;\n' },
		);
		expect(() => symbolsFromOtherPackages(dir)).toThrow(/cannot map/i);
	});

	test('fails for a re-export that does not resolve in a declaration file of the package', () => {
		const dir = fixturePackage(index, {
			'index.ts': "export type * from './inner';\n",
			'inner.d.ts': "export type * from '@fixture/not-installed';\n",
		});
		expect(() => symbolsFromOtherPackages(dir)).toThrow(/not-installed/);
	});

	test('lists a type another package declares that a declaration file of the package re-exports', () => {
		const dir = fixturePackage(index, {
			'index.ts': "export type * from './inner';\n",
			'inner.d.ts': "export type { OtherType } from '@fixture/other';\n",
		});
		expect(symbolsFromOtherPackages(dir)).toEqual([expect.stringContaining('OtherType')]);
	});

	test('skips an entry that is not JavaScript', () => {
		const dir = fixturePackage(
			{ ...index, './package.json': { import: './package.json' }, './index.css': './dist/index.css' },
			{ 'index.ts': 'export const own = 1;\n' },
		);
		expect(symbolsFromOtherPackages(dir)).toEqual([]);
	});
});

describe('symbolsSharedByEntries', () => {
	const twoEntries = { ...index, './extra': { types: './dist/extra.d.ts', import: './dist/extra.js' } };

	test('is empty for entries that export different declarations', () => {
		const dir = fixturePackage(twoEntries, {
			'index.ts': 'export const own = 1;\n',
			'extra.ts': 'export const other = 2;\n',
		});
		expect(symbolsSharedByEntries(dir)).toEqual([]);
	});

	test('lists a declaration two entries export, with both entries, even under another name', () => {
		const dir = fixturePackage(twoEntries, {
			'index.ts': 'export const own = 1;\n',
			'extra.ts': "export { own as alias } from './index';\n",
		});
		expect(symbolsSharedByEntries(dir)).toEqual(['src/index.ts#own: ., ./extra']);
	});
});
