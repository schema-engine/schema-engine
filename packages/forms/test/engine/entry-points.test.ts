import path from 'node:path';
import { expect, test } from 'vitest';
import { symbolsFromOtherPackages, symbolsSharedByEntries } from '../../../../test-utils/entry-exports';

test('no symbol is exported from two entries', () => {
	expect(symbolsSharedByEntries(path.resolve(import.meta.dirname, '../..'))).toEqual([]);
});

test('no entry exports a symbol another package declares', () => {
	expect(symbolsFromOtherPackages(path.resolve(import.meta.dirname, '../..'))).toEqual([]);
});
