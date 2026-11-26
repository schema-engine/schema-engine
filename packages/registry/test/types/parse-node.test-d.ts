import { expectTypeOf } from 'vitest';
import * as z from 'zod/mini';
import {
	createRegistry,
	safeParseNode,
	type BaseRegistration,
	type NodeLookup,
	type ReadOnlyRegistry,
} from '../../src';

const a = {
	$type: 'a',
	schema: z.object({ $type: z.literal('a'), n: z.number() }),
	metadata: { name: 'A' },
} as const;

const b = {
	$type: 'b',
	schema: z.object({ $type: z.literal('b'), label: z.string(), tone: z._default(z.string(), 'plain') }),
	metadata: { name: 'B' },
} as const;

const typed = createRegistry('Widget', [a, b]);
const result = safeParseNode(typed, {});

if (result.success && result.$type === 'a') {
	expectTypeOf(result.registration).toEqualTypeOf<typeof a>();
	expectTypeOf(result.data).toEqualTypeOf<{ $type: 'a'; n: number }>();
}

if (result.success && result.$type === 'b') {
	expectTypeOf(result.data).toEqualTypeOf<{ $type: 'b'; label: string; tone: string }>();
}

if (result.success) {
	expectTypeOf(result.registration.$type).toEqualTypeOf<'a' | 'b'>();
	expectTypeOf(result.data).toEqualTypeOf<{ $type: 'a'; n: number } | { $type: 'b'; label: string; tone: string }>();
}

const untyped: ReadOnlyRegistry<BaseRegistration> = typed;
const untypedResult = safeParseNode(untyped, {});
if (untypedResult.success) {
	expectTypeOf(untypedResult.data).toEqualTypeOf<unknown>();
}

const lookup: NodeLookup<typeof a | typeof b> = {
	get: (key) => (key === 'a' ? a : key === 'b' ? b : undefined),
};
const combined = safeParseNode(lookup, {});
if (combined.success && combined.$type === 'a') {
	expectTypeOf(combined.data).toEqualTypeOf<{ $type: 'a'; n: number }>();
}

const inline = createRegistry('Inline', [
	{ $type: 'card', schema: z.object({ title: z.string() }), metadata: { name: 'Card', tags: ['layout'] } },
	{ $type: 'badge', schema: z.object({ label: z.string() }), metadata: { name: 'Badge' } },
]);
const inlineResult = safeParseNode(inline, {});
if (inlineResult.success && inlineResult.$type === 'card') {
	expectTypeOf(inlineResult.data).toEqualTypeOf<{ title: string }>();
}
