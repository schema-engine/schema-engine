import { expectTypeOf, test } from 'vitest';
import type { Brand } from '../src';

test('brands distinguish tagged values while accepting plain values', () => {
	expectTypeOf<string>().toExtend<Brand<string, 'Element'>>();
	expectTypeOf<Brand<string, 'Element'>>().not.toExtend<Brand<string, 'Recipe'>>();
});
