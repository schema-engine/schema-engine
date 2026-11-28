import path from 'node:path';
import { expect, test } from 'vitest';
import {
	exportedSymbolNames,
	symbolsFromOtherPackages,
	symbolsSharedByEntries,
} from '../../../../test-utils/entry-exports';

test('no symbol is exported from two entries', () => {
	expect(symbolsSharedByEntries(path.resolve(import.meta.dirname, '../..'))).toEqual([]);
});

test('no entry exports a symbol another package declares', () => {
	expect(symbolsFromOtherPackages(path.resolve(import.meta.dirname, '../..'))).toEqual([]);
});

test('a container element lays out its children with ChildGrid alone', () => {
	const names = exportedSymbolNames(path.resolve(import.meta.dirname, '../..'));
	expect(names).toContain('ChildGrid');
	expect(names).not.toContain('useChildGridProps');
});
