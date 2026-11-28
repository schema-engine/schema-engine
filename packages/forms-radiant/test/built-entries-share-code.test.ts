import path from 'node:path';
import { expect, test } from 'vitest';
import { modulesBundledTwice } from '../../../test-utils/built-entries';

test('no module is bundled into two files of dist, so every entry shares one copy of its classes and brands', () => {
	expect(modulesBundledTwice(path.resolve(import.meta.dirname, '..'))).toEqual([]);
});
