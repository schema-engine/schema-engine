import { expectTypeOf } from 'vitest';
import * as z from 'zod/mini';
import { elementChildrenSchema } from '@/lib/element-children';
import { defineInput, defineStatic } from '@/types';
import { anyValue } from '../lib/any-value';

const groupSchema = z.looseObject({ $type: z.literal('group'), name: z.string(), elements: elementChildrenSchema });

const group = defineInput({
	$type: 'group',
	schema: groupSchema,
	childPaths: [{ keys: ['elements'] }],
	metadata: { name: 'Group', category: 'input' },
	render: () => null,
});

const tabs = defineInput({
	$type: 'tabs',
	schema: z.looseObject({ $type: z.literal('tabs'), elements: elementChildrenSchema }),
	childPaths: [{ keys: ['elements'], accepts: ['tab'] }],
	containerKind: 'array',
	metadata: { name: 'Tabs', category: 'input' },
	render: () => null,
});

expectTypeOf<NonNullable<typeof group.childPaths>>().toEqualTypeOf<
	readonly [{ readonly keys: readonly ['elements'] }]
>();
expectTypeOf(tabs.containerKind).toEqualTypeOf<'array' | undefined>();

// A container whose schema declares elements and whose registration has no childPaths names the fix.
defineInput(
	// @ts-expect-error -- elementsWithoutChildPaths: 'group'
	{
		$type: 'group',
		schema: groupSchema,
		metadata: { name: 'Group', category: 'input' },
		render: () => null,
	},
);

// A container declares no value: its value is its children's.
defineInput({
	$type: 'group',
	schema: groupSchema,
	childPaths: [{ keys: ['elements'] }],
	// @ts-expect-error -- value is required exactly when there is no childPaths
	value: anyValue,
	metadata: { name: 'Group', category: 'input' },
	render: () => null,
});

// containerKind alone is no container.
defineInput({
	$type: 'plain',
	schema: z.looseObject({ $type: z.literal('plain') }),
	value: anyValue,
	// @ts-expect-error -- containerKind needs childPaths beside it
	containerKind: 'object',
	metadata: { name: 'Plain', category: 'input' },
	render: () => null,
});

// Forms fixes the key to elements, and allows one path.
defineInput({
	$type: 'group',
	schema: groupSchema,
	// @ts-expect-error -- forms reads the child path ['elements'] only
	childPaths: [{ keys: ['items'] }],
	metadata: { name: 'Group', category: 'input' },
	render: () => null,
});

// Only an input can be a container.
defineStatic({
	$type: 'frame',
	schema: groupSchema,
	// @ts-expect-error -- a static element declares no childPaths
	childPaths: [{ keys: ['elements'] }],
	metadata: { name: 'Frame', category: 'content' },
	render: () => null,
});
