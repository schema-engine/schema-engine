import { expectTypeOf } from 'vitest';
import * as z from 'zod/mini';
import { createRegistry, safeParseTree, type BaseRegistration, type ReadOnlyRegistry } from '../../src';

const layout = {
	$type: 'layout',
	schema: z.looseObject({ $type: z.literal('layout'), title: z._default(z.string(), 'Page') }),
	metadata: { name: 'Layout' },
	childPaths: [['blocks']],
} as const;

const block = {
	$type: 'block',
	schema: z.looseObject({ $type: z.literal('block'), size: z.number() }),
	metadata: { name: 'Block' },
} as const;

const widgets = createRegistry('Widget', [layout, block]);
const result = safeParseTree(widgets, {});

if (result.success && result.tree.$type === 'layout') {
	expectTypeOf(result.tree.data.title).toEqualTypeOf<string>();
	expectTypeOf(result.tree.registration).toEqualTypeOf<typeof layout>();
}

if (result.success && result.tree.$type === 'block') {
	expectTypeOf(result.tree.data.size).toEqualTypeOf<number>();
}

if (result.success) {
	const child = result.tree.children.blocks;
	expectTypeOf(child).not.toBeAny();
}

const untyped: ReadOnlyRegistry<BaseRegistration> = widgets;
const untypedResult = safeParseTree(untyped, {});
if (untypedResult.success) {
	expectTypeOf(untypedResult.tree.data).toEqualTypeOf<unknown>();
}

createRegistry('Widget', [
	// @ts-expect-error a child path is a list of keys, not a dotted string
	{ ...layout, childPaths: ['engine.controls'] },
]);
