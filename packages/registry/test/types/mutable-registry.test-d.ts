import { describe, expectTypeOf, it } from 'vitest';
import * as z from 'zod/mini';
import { createMutableRegistry, type BaseRegistration, type MutableRegistry, type ReadOnlyRegistry } from '../../src';

describe('createMutableRegistry', () => {
	it('returns a MutableRegistry, which is a ReadOnlyRegistry', () => {
		const registry = createMutableRegistry<BaseRegistration>('Plugin');

		expectTypeOf(registry).toEqualTypeOf<MutableRegistry<BaseRegistration>>();
		expectTypeOf(registry).toExtend<ReadOnlyRegistry>();
	});

	it('takes a registration whose child paths the schema declares', () => {
		const registry = createMutableRegistry('Node');

		registry.register({
			$type: 'section',
			schema: z.object({ $type: z.literal('section'), widgets: z.optional(z.array(z.unknown())) }),
			metadata: { name: 'Section' },
			childPaths: [{ keys: ['widgets'], accepts: ['text'] }],
		});
	});

	it('errors, naming the $type and the keys, for a key the schema does not declare', () => {
		const registry = createMutableRegistry('Node');

		// @ts-expect-error 'typo' is not declared (childPathNotInSchema: { $type: 'section'; keys: ['typo'] })
		registry.register({
			$type: 'section',
			schema: z.object({ $type: z.literal('section'), widgets: z.optional(z.array(z.unknown())) }),
			metadata: { name: 'Section' },
			childPaths: [{ keys: ['typo'] }],
		});
	});

	it('errors, naming the $type and the property, for a child path property other than keys and accepts', () => {
		const registry = createMutableRegistry('Node');

		// @ts-expect-error 'accept' is no property of a child path (childPathUnknownProperty: { $type: 'page'; property: 'accept' })
		registry.register({
			$type: 'page',
			schema: z.object({ $type: z.literal('page'), sections: z.array(z.unknown()) }),
			metadata: { name: 'Page' },
			childPaths: [{ keys: ['sections'], accept: ['section'] }],
		});
	});

	it('has no BaseRegistry class to extend', async () => {
		const entry = await import('../../src');

		expectTypeOf(entry).not.toHaveProperty('BaseRegistry');
	});
});
