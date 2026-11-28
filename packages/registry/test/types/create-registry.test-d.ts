import type { StandardSchemaV1 } from '@standard-schema/spec';
import { describe, expectTypeOf, it } from 'vitest';
import * as z from 'zod/mini';
import { createRegistry, type ChildPath, type ReadOnlyRegistry } from '../../src';

describe('createRegistry child paths', () => {
	it('builds when the schema declares every key of every path', () => {
		const registry = createRegistry('Node', [
			{
				$type: 'section',
				schema: z.object({
					$type: z.literal('section'),
					widgets: z.optional(z.array(z.unknown())),
					aside: z.optional(z.object({ header: z.unknown() })),
				}),
				metadata: { name: 'Section' },
				childPaths: [{ keys: ['widgets'] }, { keys: ['aside', 'header'], accepts: ['text'] }],
			},
		]);

		expectTypeOf(registry).toExtend<ReadOnlyRegistry>();
	});

	it('errors, naming the $type and the keys, for a key the schema does not declare', () => {
		// @ts-expect-error 'typo' is not declared under 'aside' (childPathNotInSchema: { $type: 'section'; keys: ['aside', 'typo'] })
		createRegistry('Bad', [
			{
				$type: 'section',
				schema: z.object({ $type: z.literal('section'), aside: z.optional(z.object({ header: z.unknown() })) }),
				metadata: { name: 'Section' },
				childPaths: [{ keys: ['aside', 'typo'] }],
			},
		]);
	});

	it('errors, naming the $type and the property, for a child path property other than keys and accepts', () => {
		// @ts-expect-error 'accept' is no property of a child path (childPathUnknownProperty: { $type: 'page'; property: 'accept' })
		createRegistry('Bad', [
			{
				$type: 'page',
				schema: z.object({ $type: z.literal('page'), sections: z.array(z.unknown()) }),
				metadata: { name: 'Page' },
				childPaths: [{ keys: ['sections'], accept: ['section'] }],
			},
		]);
	});

	it('accepts list: true on a child path, and errors for any other value', () => {
		createRegistry('Ok', [
			{
				$type: 'page',
				schema: z.object({ $type: z.literal('page'), sections: z.array(z.unknown()) }),
				metadata: { name: 'Page' },
				childPaths: [{ keys: ['sections'], list: true }],
			},
		]);
		createRegistry('Bad', [
			{
				$type: 'page',
				schema: z.object({ $type: z.literal('page'), sections: z.array(z.unknown()) }),
				metadata: { name: 'Page' },
				// @ts-expect-error list is true or absent
				childPaths: [{ keys: ['sections'], list: false }],
			},
		]);
	});

	it('errors, naming the $type and the keys, for a list path whose slot the schema types as no array', () => {
		// @ts-expect-error list: true on a slot the schema declares as an object (listPathNotAnArray: { $type: 'page'; keys: ['header'] })
		createRegistry('Bad', [
			{
				$type: 'page',
				schema: z.object({ $type: z.literal('page'), header: z.object({ $type: z.string() }) }),
				metadata: { name: 'Page' },
				childPaths: [{ keys: ['header'], list: true }],
			},
		]);
	});

	it('errors for a list path that runs through an object to a slot that is no array', () => {
		// @ts-expect-error the slot 'aside.header' is an object
		createRegistry('Bad', [
			{
				$type: 'page',
				schema: z.object({ $type: z.literal('page'), aside: z.object({ header: z.string() }) }),
				metadata: { name: 'Page' },
				childPaths: [{ keys: ['aside', 'header'], list: true }],
			},
		]);
	});

	it('accepts a list path whose slot is an array, optional, nullable or opaque', () => {
		createRegistry('Ok', [
			{
				$type: 'page',
				schema: z.object({
					$type: z.literal('page'),
					list: z.array(z.unknown()),
					optional: z.optional(z.array(z.unknown())),
					nullable: z.nullable(z.array(z.unknown())),
					opaque: z.unknown(),
					aside: z.object({ header: z.array(z.unknown()) }),
					readonly: z.readonly(z.array(z.unknown())),
				}),
				metadata: { name: 'Page' },
				childPaths: [
					{ keys: ['list'], list: true },
					{ keys: ['optional'], list: true },
					{ keys: ['nullable'], list: true },
					{ keys: ['opaque'], list: true },
					{ keys: ['aside', 'header'], list: true },
					{ keys: ['readonly'], list: true },
				],
			},
		]);
	});

	it('does not check a list path of a registration whose schema output cannot be read', () => {
		createRegistry('Ok', [
			{
				$type: 'page',
				schema: {} as StandardSchemaV1,
				metadata: { name: 'Page' },
				childPaths: [{ keys: ['header'], list: true }],
			},
		]);
	});

	it('errors for a key that only a loose schema allows through its index signature', () => {
		// @ts-expect-error a loose schema allows 'content' but does not declare it
		createRegistry('Bad', [
			{
				$type: 'box',
				schema: z.looseObject({ $type: z.literal('box') }),
				metadata: { name: 'Box' },
				childPaths: [{ keys: ['content'] }],
			},
		]);
	});

	it('errors for a key that a strict schema strips', () => {
		// @ts-expect-error a strict object schema drops 'sections' from its output
		createRegistry('Bad', [
			{
				$type: 'page',
				schema: z.object({ $type: z.literal('page') }),
				metadata: { name: 'Page' },
				childPaths: [{ keys: ['sections'] }],
			},
		]);
	});

	it('does not check a schema whose output type cannot be read', () => {
		const opaque = {} as StandardSchemaV1;

		createRegistry('Opaque', [
			{ $type: 'x', schema: opaque, metadata: { name: 'X' }, childPaths: [{ keys: ['anything'] }] },
		]);
	});

	it('is an error to write a path as a list of keys, as before 0.6', () => {
		createRegistry('Bad', [
			{
				$type: 'page',
				schema: z.object({ $type: z.literal('page'), sections: z.array(z.unknown()) }),
				metadata: { name: 'Page' },
				// @ts-expect-error a child path is { keys, accepts?, list? }, not a list of keys
				childPaths: [['sections']],
			},
		]);
	});

	it('names a child path as { keys, accepts?, list? } with read-only lists', () => {
		expectTypeOf<ChildPath>().toEqualTypeOf<{
			readonly keys: readonly string[];
			readonly accepts?: readonly string[];
			readonly list?: true;
		}>();
	});
});
