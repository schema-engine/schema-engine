import path from 'node:path';
import { expect, test } from 'vitest';
import { symbolsFromOtherPackages } from '../../../test-utils/entry-exports';

test('no entry exports a symbol another package declares', () => {
	expect(symbolsFromOtherPackages(path.resolve(import.meta.dirname, '..'))).toEqual([]);
});
