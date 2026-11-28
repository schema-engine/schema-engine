import { describe, expectTypeOf, it } from 'vitest';
import * as z from 'zod/mini';
import { exportTreeSchema, type ExportLookup } from '../../src';

describe('ExportLookup', () => {
	it('takes a lookup of tree registrations, which carry no metadata', () => {
		const leaves = { all: () => [{ $type: 'leaf', schema: z.object({ $type: z.literal('leaf') }) }] };

		expectTypeOf(leaves).toExtend<ExportLookup>();
		expectTypeOf(exportTreeSchema).toBeCallableWith(leaves);
	});
});
