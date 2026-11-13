import { expectTypeOf } from 'vitest';
import type { DeepReadonly } from '@/lib/normalized-form-config';

expectTypeOf<DeepReadonly<{ a: { b: string[] } }>>().toEqualTypeOf<{
	readonly a: { readonly b: ReadonlyArray<string> };
}>();
