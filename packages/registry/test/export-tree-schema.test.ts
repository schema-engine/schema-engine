import { afterEach, describe, expect, it } from 'vitest';
import * as z from 'zod/mini';
import {
	createMutableRegistry,
	RegistryError,
	createRegistry,
	exportTreeSchema,
	type BaseRegistration,
	type ExportSchemaContext,
	type JSONSchemaObject,
} from '../src';
import { compileJSONSchema } from './helpers/compile-json-schema';
import { jsonSchemaOf } from './helpers/json-schema-of';

type Resolve = NonNullable<Parameters<typeof exportTreeSchema>[1]>['resolve'];

/** The Zod-first resolve a domain passes, as forms does: Zod converts its own schemas, anything else is open. */
const zodFirst: Resolve = (schema, { io, target }) =>
	'_zod' in schema ? z.toJSONSchema(schema as z.ZodMiniType, { io, target }) : undefined;

const metadata = { name: 'Node' };
const typed = <T extends string>(type: T) => z.literal(type);

const zodNodes = createRegistry('Node', [
	{
		$type: 'page',
		schema: z.object({
			$type: typed('page'),
			title: z._default(z.string(), 'Untitled'),
			sections: z.array(z.unknown()).check(z.minLength(1), z.maxLength(5)),
		}),
		metadata,
		childPaths: [{ keys: ['sections'], accepts: ['section'] }],
	},
	{
		$type: 'section',
		schema: z.object({
			$type: typed('section'),
			widgets: z.optional(z.array(z.unknown())),
			aside: z.optional(z.object({ header: z.looseObject({ $type: z.string() }) })),
			nested: z.optional(z.array(z.unknown())),
		}),
		metadata,
		childPaths: [
			{ keys: ['widgets'], accepts: ['chart', 'text'] },
			{ keys: ['aside', 'header'], accepts: ['text'] },
			{ keys: ['nested'], accepts: ['section'] },
		],
	},
	{ $type: 'chart', schema: z.object({ $type: typed('chart'), metric: z.string() }), metadata },
	{ $type: 'text', schema: z.object({ $type: typed('text'), value: z.string() }), metadata },
	{
		$type: 'frame',
		schema: z.object({ $type: typed('frame'), content: z.optional(z.unknown()) }),
		metadata,
		childPaths: [{ keys: ['content'] }],
	},
]);

const ref = (name: string) => ({ $ref: `#/$defs/${name}` });
const union = (...names: string[]) => ({ anyOf: names.map(ref) });
const everyType = ['page', 'section', 'chart', 'text', 'frame'];

function properties(document: JSONSchemaObject, type: string): Record<string, JSONSchemaObject> {
	const definitions = document.$defs as Record<string, { properties: Record<string, JSONSchemaObject> }>;
	return definitions[type]!.properties;
}

function pointerTarget(document: JSONSchemaObject, pointer: string): unknown {
	let current: unknown = document;
	for (const token of pointer.slice(2).split('/')) {
		const name = decodeURIComponent(token).replaceAll('~1', '/').replaceAll('~0', '~');
		if (typeof current !== 'object' || current === null || !Object.hasOwn(current, name)) return undefined;
		current = (current as Record<string, unknown>)[name];
	}
	return current;
}

/** Every `$ref` of the document, whatever keyword holds it. */
function referencesOf(node: unknown, found: string[] = []): string[] {
	if (Array.isArray(node)) node.forEach((item) => referencesOf(item, found));
	else if (typeof node === 'object' && node !== null) {
		for (const [key, value] of Object.entries(node)) {
			if (key === '$ref' && typeof value === 'string') found.push(value);
			else referencesOf(value, found);
		}
	}
	return found;
}

function expectEveryReferenceToResolve(document: JSONSchemaObject): void {
	const references = referencesOf(document);
	expect(references.length).toBeGreaterThan(0);
	for (const reference of references) expect(pointerTarget(document, reference), reference).toBeDefined();
}

const thrown = (build: () => unknown): unknown => {
	try {
		build();
	} catch (error) {
		return error;
	}
	throw new Error('Expected the export to throw');
};

const handWritten = (document: JSONSchemaObject, childPaths: BaseRegistration['childPaths'], $type: string) =>
	({ $type, schema: jsonSchemaOf(document), metadata, childPaths }) satisfies BaseRegistration;

const unreachable = (document: JSONSchemaObject, keys: string[]) =>
	thrown(() =>
		exportTreeSchema(
			createRegistry('Node', [
				{
					$type: 'box',
					schema: jsonSchemaOf(document),
					metadata,
					childPaths: [{ keys }],
				} as BaseRegistration,
			]),
		),
	);

describe('exportTreeSchema', () => {
	describe('Scenario: A Zod registry exports with a Zod-first resolve', () => {
		const document = exportTreeSchema(zodNodes, { resolve: zodFirst });

		it('writes one definition per $type under $defs, with the dialect', () => {
			expect(document.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
			expect(Object.keys(document.$defs as object)).toEqual(everyType);
			expectEveryReferenceToResolve(document);
		});

		it('replaces an array slot by its items and keeps requiredness and bounds', () => {
			const page = (document.$defs as Record<string, JSONSchemaObject>).page!;

			expect(properties(document, 'page').sections).toEqual({
				type: 'array',
				items: union('section'),
				minItems: 1,
				maxItems: 5,
			});
			expect(page.required).toEqual(['$type', 'sections']);
			expect(properties(document, 'page').title).toMatchObject({ type: 'string' });
		});

		it('keeps an optional slot optional and a nested array slot listing its accepted types', () => {
			const section = (document.$defs as Record<string, JSONSchemaObject>).section!;

			expect(properties(document, 'section').widgets).toEqual({ type: 'array', items: union('chart', 'text') });
			expect(section.required).toEqual(['$type']);
		});

		it('replaces an object slot by the union itself, through the keys of a nested object', () => {
			const aside = properties(document, 'section').aside as {
				properties: Record<string, unknown>;
				required: string[];
			};

			expect(aside.properties.header).toEqual(union('text'));
			expect(aside.required).toEqual(['header']);
		});

		it('writes an open slot as a child or a list of children, of every $type without accepts', () => {
			const every = union(...everyType);

			expect(properties(document, 'frame').content).toEqual({ anyOf: [every, { type: 'array', items: every }] });
		});

		it('refers to a self-accepting slot by a $ref to its own definition', () => {
			expect(properties(document, 'section').nested).toEqual({ type: 'array', items: union('section') });
		});

		it('writes the root as the union of every $type', () => {
			expect(document.anyOf).toEqual(everyType.map(ref));
		});

		it('writes the root as the union of options.accepts', () => {
			expect(exportTreeSchema(zodNodes, { resolve: zodFirst, accepts: ['page', 'frame'] }).anyOf).toEqual([
				ref('page'),
				ref('frame'),
			]);
		});

		it('leaves the schemas of the registrations leaf types untouched', () => {
			expect(properties(document, 'chart')).toEqual({
				$type: { type: 'string', const: 'chart' },
				metric: { type: 'string' },
			});
		});

		it('is identical for the output shape apart from what io changes', () => {
			const output = exportTreeSchema(zodNodes, { resolve: zodFirst, io: 'output' });

			expect((output.$defs as Record<string, JSONSchemaObject>).page!.required).toEqual([
				'$type',
				'title',
				'sections',
			]);
			expect(properties(output, 'page').sections).toMatchObject({ items: union('section') });
		});

		it('does not resolve Zod without a resolve function: Zod Mini has no ~standard.jsonSchema, so each is open', () => {
			const open = exportTreeSchema(zodNodes);

			expect(properties(open, 'chart')).toEqual({ $type: { const: 'chart' } });
		});
	});

	describe('Scenario: A hand-written ~standard.jsonSchema registry exports the same way', () => {
		const handNodes = createRegistry('Node', [
			handWritten(
				{
					type: 'object',
					properties: {
						$type: { const: 'page' },
						sections: { type: 'array', items: {}, minItems: 1, maxItems: 5 },
					},
					required: ['$type', 'sections'],
				},
				[{ keys: ['sections'], accepts: ['section'] }],
				'page',
			),
			handWritten(
				{
					type: 'object',
					properties: {
						$type: { const: 'section' },
						widgets: { type: 'array', items: {} },
						aside: {
							type: 'object',
							properties: { header: { type: 'object', properties: { $type: { type: 'string' } } } },
							required: ['header'],
						},
						nested: { type: 'array', items: {} },
					},
					required: ['$type'],
				},
				[
					{ keys: ['widgets'], accepts: ['chart', 'text'] },
					{ keys: ['aside', 'header'], accepts: ['text'] },
					{ keys: ['nested'], accepts: ['section'] },
				],
				'section',
			),
			handWritten({ type: 'object', properties: { $type: { const: 'chart' } } }, undefined, 'chart'),
			handWritten({ type: 'object', properties: { $type: { const: 'text' } } }, undefined, 'text'),
			handWritten(
				{ type: 'object', properties: { $type: { const: 'frame' }, content: {} } },
				[{ keys: ['content'] }],
				'frame',
			),
		]);

		it('writes each slot form as the Zod registry does', () => {
			const hand = exportTreeSchema(handNodes);
			const zod = exportTreeSchema(zodNodes, { resolve: zodFirst });

			for (const [type, slots] of [
				['page', ['sections']],
				['section', ['widgets', 'aside', 'nested']],
				['frame', ['content']],
			] as const) {
				for (const slot of slots) {
					expect(properties(hand, type)[slot], `${type}.${slot}`).toEqual(properties(zod, type)[slot]);
				}
			}
			expect(hand.anyOf).toEqual(zod.anyOf);
			expect(Object.keys(hand.$defs as object)).toEqual(Object.keys(zod.$defs as object));
		});

		it('reads io and target through to the converter and does not change what it returns', () => {
			const calls: { io: string; target: string }[] = [];
			const source = {
				type: 'object',
				properties: { $type: { const: 'box' }, kids: { type: 'array', items: {} } },
			};
			const boxes = createRegistry('Node', [
				{
					$type: 'box',
					schema: jsonSchemaOf(source, calls),
					metadata,
					childPaths: [{ keys: ['kids'] }],
				} as BaseRegistration,
			]);

			const document = exportTreeSchema(boxes, { io: 'output', target: 'draft-07' });

			expect(calls).toEqual([{ io: 'output', target: 'draft-07' }]);
			expect(document.$schema).toBe('http://json-schema.org/draft-07/schema#');
			expect(Object.keys(document)).toContain('definitions');
			expect(source.properties.kids).toEqual({ type: 'array', items: {} });
		});

		it('defaults to the input shape and draft 2020-12', () => {
			const calls: { io: string; target: string }[] = [];
			exportTreeSchema(
				createRegistry('Node', [
					{ $type: 'box', schema: jsonSchemaOf({ type: 'object' }, calls), metadata } as BaseRegistration,
				]),
			);

			expect(calls).toEqual([{ io: 'input', target: 'draft-2020-12' }]);
		});
	});

	describe('Scenario: A schema the export cannot read is listed by an open object', () => {
		const nodes = createRegistry('Node', [
			{
				$type: 'machine',
				schema: z.object({
					$type: typed('machine'),
					blocks: z.unknown(),
					engine: z.object({ controls: z.unknown(), tabs: z.object({ items: z.unknown() }) }),
				}),
				metadata,
				childPaths: [
					{ keys: ['blocks'], accepts: ['part'] },
					{ keys: ['engine', 'controls'], accepts: ['part', 'knob'] },
					{ keys: ['engine', 'tabs', 'items'] },
				],
			},
			{ $type: 'part', schema: z.object({}), metadata },
			{ $type: 'knob', schema: z.object({}), metadata },
		]);

		it('builds the properties chain from the keys, with the open form of a slot at the end', () => {
			const open = exportTreeSchema(nodes, { resolve: () => undefined });
			const every = union('machine', 'part', 'knob');

			expect((open.$defs as Record<string, unknown>).machine).toEqual({
				type: 'object',
				properties: {
					$type: { const: 'machine' },
					blocks: { anyOf: [union('part'), { type: 'array', items: union('part') }] },
					engine: {
						type: 'object',
						properties: {
							controls: {
								anyOf: [union('part', 'knob'), { type: 'array', items: union('part', 'knob') }],
							},
							tabs: {
								type: 'object',
								properties: { items: { anyOf: [every, { type: 'array', items: every }] } },
							},
						},
					},
				},
				required: ['$type'],
			});
			expectEveryReferenceToResolve(open);
			const validate = compileJSONSchema(open);
			expect(
				validate({ $type: 'machine', blocks: { $type: 'part' }, engine: { controls: [{ $type: 'knob' }] } }),
			).toBe(true);
			expect(validate({ $type: 'machine', blocks: [{ $type: 'knob' }] })).toBe(false);
		});

		it('lists the schemas the resolve function returns nothing for, beside the ones it reads', () => {
			const mixed = exportTreeSchema(nodes, {
				resolve: (schema, context) =>
					schema === nodes.get('part')!.schema ? undefined : zodFirst(schema, context),
			});

			expect((mixed.$defs as Record<string, unknown>).part).toEqual({
				type: 'object',
				properties: { $type: { const: 'part' } },
				required: ['$type'],
			});
			expect(properties(mixed, 'knob')).toEqual({});
		});
	});

	describe('Scenario: Definitions a converter wrote into its own document are hoisted', () => {
		const addressDocument = {
			$schema: 'https://json-schema.org/draft/2020-12/schema',
			type: 'object',
			$defs: {
				address: { type: 'object', properties: { line: { $ref: '#/$defs/line' }, parent: { $ref: '#' } } },
				line: { type: 'string' },
			},
			properties: {
				$type: { const: 'card' },
				address: { $ref: '#/$defs/address' },
				children: { type: 'array', items: {} },
				self: { $ref: '#' },
			},
		};
		const nodes = createRegistry('Node', [
			handWritten(addressDocument, [{ keys: ['children'], accepts: ['card', 'note'] }], 'card'),
			handWritten(
				{
					type: 'object',
					$defs: { address: { type: 'string' } },
					properties: { where: { $ref: '#/$defs/address' } },
				},
				undefined,
				'note',
			),
		]);

		it('lifts its $defs to the top under the owner, and every pointer follows', () => {
			const document = exportTreeSchema(nodes);
			const definitions = document.$defs as Record<string, JSONSchemaObject>;

			expect(Object.keys(definitions)).toEqual(['card', 'card.address', 'card.line', 'note', 'note.address']);
			expect(definitions.card).not.toHaveProperty('$defs');
			expect(definitions.card).not.toHaveProperty('$schema');
			expect(properties(document, 'card').address).toEqual(ref('card.address'));
			expect(properties(document, 'card').self).toEqual(ref('card'));
			expect(definitions['card.address']).toEqual({
				type: 'object',
				properties: { line: ref('card.line'), parent: ref('card') },
			});
			expect(properties(document, 'note').where).toEqual(ref('note.address'));
			expectEveryReferenceToResolve(document);
			const validate = compileJSONSchema(exportTreeSchema(nodes, { accepts: ['card'] }));
			expect(validate({ $type: 'card', address: { line: 'Main St' }, children: [{ where: 'here' }] })).toBe(true);
			expect(validate({ $type: 'card', address: { line: 1 } })).toBe(false);
		});

		it('does not change what the converter returned', () => {
			const calls: { io: string; target: string }[] = [];
			const source = structuredClone(addressDocument);
			exportTreeSchema(
				createRegistry('Node', [
					{ $type: 'card', schema: jsonSchemaOf(source, calls), metadata } as BaseRegistration,
				]),
			);

			expect(source).toEqual(addressDocument);
		});

		it('writes them under definitions for a draft-07 target, where $ref pointers point', () => {
			const draft07 = createRegistry('Node', [
				handWritten(
					{
						type: 'object',
						definitions: { part: { type: 'string' } },
						properties: { part: { $ref: '#/definitions/part' } },
					},
					undefined,
					'card',
				),
			]);
			const document = exportTreeSchema(draft07, { target: 'draft-07' });

			expect(document.definitions).toEqual({
				card: { type: 'object', properties: { part: { $ref: '#/definitions/card.part' } } },
				'card.part': { type: 'string' },
			});
			expect(document).not.toHaveProperty('$defs');
			expect(compileJSONSchema(document)({ part: 'x' })).toBe(true);
			expect(compileJSONSchema(document)({ part: 1 })).toBe(false);
		});

		it('renames the anchors a schema declares under their owner', () => {
			const anchored = createRegistry('Node', [
				handWritten(
					{ type: 'object', properties: { a: { $anchor: 'node', type: 'string' }, b: { $ref: '#node' } } },
					undefined,
					'one',
				),
				handWritten(
					{ type: 'object', properties: { a: { $anchor: 'node', type: 'number' }, b: { $ref: '#node' } } },
					undefined,
					'two',
				),
			]);
			const document = exportTreeSchema(anchored);

			expect(properties(document, 'one')).toEqual({
				a: { $anchor: 'one-node', type: 'string' },
				b: { $ref: '#one-node' },
			});
			expect(properties(document, 'two')).toEqual({
				a: { $anchor: 'two-node', type: 'number' },
				b: { $ref: '#two-node' },
			});
			const validate = compileJSONSchema(document);
			expect(validate({ a: 'x', b: 'y' })).toBe(true);
			expect(validate({ a: true })).toBe(false);
		});

		it('keeps a schema with an $id of its own as it is', () => {
			const resource = {
				$id: 'https://example.com/leaf',
				type: 'object',
				properties: { x: { $ref: '#/$defs/x' } },
				$defs: { x: {} },
			};
			const document = exportTreeSchema(
				createRegistry('Node', [
					{ $type: 'leaf', schema: jsonSchemaOf(resource), metadata } as BaseRegistration,
				]),
			);

			expect((document.$defs as Record<string, unknown>).leaf).toEqual(resource);
			expect(compileJSONSchema(document)({ x: 1 })).toBe(true);
		});

		it('throws for a slot inside a schema with an $id of its own, where a $ref would not reach the document', () => {
			const inResource = (document: JSONSchemaObject, keys: string[]) =>
				expect(unreachable(document, keys)).toMatchObject({ code: 'unreachable-child-path', childPath: keys });

			inResource({ $id: 'https://example.com/box', type: 'object', properties: { kids: { type: 'array' } } }, [
				'kids',
			]);
			inResource(
				{
					type: 'object',
					properties: { inner: { $id: 'https://example.com/inner', properties: { kids: {} } } },
				},
				['inner', 'kids'],
			);
			inResource({ type: 'object', properties: { kids: { $id: 'https://example.com/kids', items: {} } } }, [
				'kids',
			]);
		});

		it('throws when a lifted definition takes the name of a $type', () => {
			const clashing = createRegistry('Node', [
				{ ...handWritten(addressDocument, undefined, 'card') },
				{ $type: 'card.line', schema: jsonSchemaOf({ type: 'object' }), metadata } as BaseRegistration,
			]);
			const error = thrown(() => exportTreeSchema(clashing));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({ code: 'definition-name-clash', $type: 'card', key: 'card.line' });
		});

		it('throws when two owners lift to the same name', () => {
			const clashing = createRegistry('Node', [
				handWritten({ type: 'object', $defs: { 'b.c': {} } }, undefined, 'a'),
				handWritten({ type: 'object', $defs: { c: {} } }, undefined, 'a.b'),
			]);

			expect(thrown(() => exportTreeSchema(clashing))).toMatchObject({
				code: 'definition-name-clash',
				key: 'a.b.c',
			});
		});
	});

	describe('Scenario: A $type is a JSON Pointer token in a $ref', () => {
		it('escapes ~ and / and percent-encodes the rest of the fragment', () => {
			const nodes = createRegistry('Node', [
				handWritten({ type: 'object' }, undefined, 'ui/button'),
				handWritten({ type: 'object' }, undefined, 'a~b'),
				handWritten({ type: 'object' }, undefined, 'my type'),
			]);
			const document = exportTreeSchema(nodes);

			expect(document.anyOf).toEqual([
				{ $ref: '#/$defs/ui~1button' },
				{ $ref: '#/$defs/a~0b' },
				{ $ref: '#/$defs/my%20type' },
			]);
			expect(Object.keys(document.$defs as object)).toEqual(['ui/button', 'a~b', 'my type']);
			expectEveryReferenceToResolve(document);
			expect(compileJSONSchema(document)({})).toBe(true);
		});
	});

	describe('Scenario: A vocabulary spread over several registries', () => {
		const layouts = createRegistry('Layout', [
			{
				$type: 'layout',
				schema: jsonSchemaOf({ type: 'object', properties: { blocks: { type: 'array', items: {} } } }),
				metadata,
				childPaths: [{ keys: ['blocks'], accepts: ['component'] }],
			} as BaseRegistration,
		]);
		const slotNodes = createRegistry('SlotNode', [
			{ $type: 'component', schema: jsonSchemaOf({ type: 'object' }), metadata } as BaseRegistration,
		]);

		it('exports a list of registries as one document', () => {
			const document = exportTreeSchema([layouts, slotNodes], { accepts: ['layout'] });

			expect(Object.keys(document.$defs as object)).toEqual(['layout', 'component']);
			expect(properties(document, 'layout').blocks).toEqual({ type: 'array', items: union('component') });
			expect(document.anyOf).toEqual([ref('layout')]);
		});

		it('exports a mutable registry alone', () => {
			const mutable = createMutableRegistry<BaseRegistration>('MutableNode');
			mutable.register({
				$type: 'component',
				schema: jsonSchemaOf({ type: 'object' }),
				metadata,
			} as BaseRegistration);
			const document = exportTreeSchema(mutable);

			expect(Object.keys(document.$defs as object)).toEqual(['component']);
			expect(document.anyOf).toEqual([ref('component')]);
		});

		it('exports a mutable registry in a list with a createRegistry result', () => {
			const mutable = createMutableRegistry<BaseRegistration>('MutableNode');
			mutable.register({
				$type: 'component',
				schema: jsonSchemaOf({ type: 'object' }),
				metadata,
			} as BaseRegistration);
			const document = exportTreeSchema([layouts, mutable], { accepts: ['layout'] });

			expect(Object.keys(document.$defs as object)).toEqual(['layout', 'component']);
			expect(properties(document, 'layout').blocks).toEqual({ type: 'array', items: union('component') });
		});

		it('lets the first registry win a $type both list', () => {
			const other = createRegistry('Other', [
				{ $type: 'component', schema: jsonSchemaOf({ type: 'string' }), metadata } as BaseRegistration,
			]);
			const document = exportTreeSchema([slotNodes, other]);

			expect((document.$defs as Record<string, unknown>).component).toEqual({ type: 'object' });
		});

		it('throws, naming the path, when a slot accepts a $type the lookup lacks', () => {
			const error = thrown(() => exportTreeSchema(layouts));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'unknown-accepted-type',
				$type: 'layout',
				childPath: ['blocks'],
				key: 'component',
			});
		});
	});

	describe('Scenario: The root and the lookup are checked', () => {
		it.each([
			['an empty accepts', { accepts: [] }, 'accepts must list at least one $type.'],
			['an accepts the lookup lacks', { accepts: ['nope'] }, "accepts names 'nope', which is not registered."],
		])('throws for %s', (_name, options, message) => {
			expect(thrown(() => exportTreeSchema(zodNodes, options))).toMatchObject({ message });
		});

		it('throws for a lookup without registrations', () => {
			expect(thrown(() => exportTreeSchema(createRegistry('Node', [])))).toMatchObject({
				message: 'exportTreeSchema needs at least one registration.',
			});
		});
	});

	describe('Scenario: A slot the walk cannot reach throws, naming the $type and the child path', () => {
		it.each([
			[
				'behind a $ref',
				{ type: 'object', $defs: { list: { type: 'array' } }, properties: { kids: { $ref: '#/$defs/list' } } },
				['kids'],
			],
			[
				'behind allOf',
				{ type: 'object', properties: { kids: { allOf: [{ type: 'array', items: {} }] } } },
				['kids'],
			],
			[
				'behind a union',
				{ type: 'object', properties: { kids: { anyOf: [{ type: 'array', items: {} }, { type: 'null' }] } } },
				['kids'],
			],
			[
				'behind a type list',
				{ type: 'object', properties: { kids: { type: ['array', 'null'], items: {} } } },
				['kids'],
			],
			['not declared', { type: 'object', properties: { other: {} } }, ['kids']],
			['without properties', { type: 'object' }, ['kids']],
			[
				'through an object behind a $ref',
				{ type: 'object', properties: { inner: { $ref: '#/$defs/inner' } } },
				['inner', 'kids'],
			],
			['through an undeclared object', { type: 'object', properties: {} }, ['inner', 'kids']],
			['a string where nodes go', { type: 'object', properties: { kids: { type: 'string' } } }, ['kids']],
			['the schema false', { type: 'object', properties: { kids: false } }, ['kids']],
		])('throws for a slot %s', (_name, document, keys) => {
			const error = unreachable(document, keys);

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({ code: 'unreachable-child-path', $type: 'box', childPath: keys });
			expect((error as Error).message).toContain(`'box'`);
			expect((error as Error).message).toContain(`'${keys.join('.')}'`);
		});

		it('reads the schema true as an open slot', () => {
			const document = exportTreeSchema(
				createRegistry('Node', [
					{
						$type: 'box',
						schema: jsonSchemaOf({ type: 'object', properties: { kids: true } }),
						metadata,
						childPaths: [{ keys: ['kids'] }],
					} as BaseRegistration,
				]),
			);

			expect(properties(document, 'box').kids).toEqual({
				anyOf: [union('box'), { type: 'array', items: union('box') }],
			});
		});
	});

	describe('Scenario: The slot keeps its annotations', () => {
		it('keeps the title and description of an object and an open slot, and the default of an array', () => {
			const document = exportTreeSchema(
				createRegistry('Node', [
					{
						$type: 'box',
						schema: jsonSchemaOf({
							type: 'object',
							properties: {
								one: { type: 'object', properties: {}, description: 'One child' },
								many: { type: 'array', items: {}, default: [] },
								either: { title: 'Either' },
							},
						}),
						metadata,
						childPaths: [{ keys: ['one'] }, { keys: ['many'] }, { keys: ['either'] }],
					} as BaseRegistration,
				]),
			);

			expect(properties(document, 'box')).toEqual({
				one: { description: 'One child', ...union('box') },
				many: { type: 'array', items: union('box'), default: [] },
				either: { title: 'Either', anyOf: [union('box'), { type: 'array', items: union('box') }] },
			});
		});
	});

	describe('Scenario: A child path named after an Object.prototype member leaves the prototype alone', () => {
		const nodes = createRegistry('Node', [
			handWritten({ type: 'object' }, [{ keys: ['__proto__', 'kids'], accepts: ['box'] }], 'box'),
		]);

		afterEach(() => {
			Reflect.deleteProperty(Object.prototype, 'properties');
		});

		it('writes the key as an own property of the open object and pollutes nothing', () => {
			const document = exportTreeSchema(nodes, { resolve: () => undefined });
			const box = (document.$defs as Record<string, JSONSchemaObject>).box!;
			const properties = box.properties as Record<string, unknown>;

			expect(Object.hasOwn({}, 'properties')).toBe(false);
			expect('properties' in Object.prototype).toBe(false);
			expect(Object.hasOwn(properties, '__proto__')).toBe(true);
			expect(Object.getPrototypeOf(properties)).toBe(Object.prototype);
			const inner = Object.getOwnPropertyDescriptor(properties, '__proto__')!.value as JSONSchemaObject;
			expect(Object.hasOwn(inner, 'properties')).toBe(true);
			expect(Object.hasOwn(inner.properties as object, 'kids')).toBe(true);
			expect(JSON.parse(JSON.stringify(document)).$defs.box.properties).toEqual(
				expect.objectContaining({ $type: { const: 'box' } }),
			);
		});

		it('still compiles', () => {
			expect(() => compileJSONSchema(exportTreeSchema(nodes, { resolve: () => undefined }))).not.toThrow();
		});
	});

	describe('Scenario: A tuple slot holds children at every position', () => {
		const tuple = (extra: JSONSchemaObject) =>
			createRegistry('Node', [
				{
					$type: 'split',
					schema: jsonSchemaOf({
						type: 'object',
						properties: { $type: { const: 'split' }, panes: { type: 'array', ...extra } },
					}),
					metadata,
					childPaths: [{ keys: ['panes'], accepts: ['pane'] }],
				} as BaseRegistration,
				{ $type: 'pane', schema: z.object({ $type: typed('pane') }), metadata },
			]);
		const pane = { $type: 'pane' };

		it('refuses a wrong $type at a prefix position of a 2020-12 tuple, and keeps it closed', () => {
			const validate = compileJSONSchema(
				exportTreeSchema(tuple({ prefixItems: [{}, {}], items: false, minItems: 2, maxItems: 2 }), {
					accepts: ['split'],
				}),
			);

			expect(validate({ $type: 'split', panes: [pane, pane] })).toBe(true);
			expect(validate({ $type: 'split', panes: [{ $type: 'other' }, pane] })).toBe(false);
			expect(validate({ $type: 'split', panes: [pane, { $type: 'other' }] })).toBe(false);
			expect(validate({ $type: 'split', panes: [pane, pane, pane] })).toBe(false);
		});

		it('requires children in the rest of a 2020-12 tuple', () => {
			const validate = compileJSONSchema(
				exportTreeSchema(tuple({ prefixItems: [{}], items: {}, minItems: 1 }), { accepts: ['split'] }),
			);

			expect(validate({ $type: 'split', panes: [pane, pane, pane] })).toBe(true);
			expect(validate({ $type: 'split', panes: [pane, pane, { $type: 'other' }] })).toBe(false);
			expect(validate({ $type: 'split', panes: [{ $type: 'other' }] })).toBe(false);
		});

		it('refuses a wrong $type at a position of a draft-07 tuple, and keeps it closed', () => {
			const validate = compileJSONSchema(
				exportTreeSchema(tuple({ items: [{}, {}], additionalItems: false }), {
					accepts: ['split'],
					target: 'draft-07',
				}),
			);

			expect(validate({ $type: 'split', panes: [pane, pane] })).toBe(true);
			expect(validate({ $type: 'split', panes: [{ $type: 'other' }, pane] })).toBe(false);
			expect(validate({ $type: 'split', panes: [pane, pane, pane] })).toBe(false);
		});

		it('refuses a wrong $type in the additional items of a draft-07 tuple', () => {
			const validate = compileJSONSchema(
				exportTreeSchema(tuple({ items: [{}], additionalItems: {}, minItems: 1 }), {
					accepts: ['split'],
					target: 'draft-07',
				}),
			);

			expect(validate({ $type: 'split', panes: [pane, pane] })).toBe(true);
			expect(validate({ $type: 'split', panes: [pane, { $type: 'other' }] })).toBe(false);
		});

		it('writes a Zod tuple the same way', () => {
			const nodes = createRegistry('Node', [
				{
					$type: 'split',
					schema: z.object({ $type: typed('split'), panes: z.tuple([z.unknown(), z.unknown()]) }),
					metadata,
					childPaths: [{ keys: ['panes'], accepts: ['pane'] }],
				},
				{ $type: 'pane', schema: z.object({ $type: typed('pane') }), metadata },
			]);
			const validate = compileJSONSchema(exportTreeSchema(nodes, { resolve: zodFirst, accepts: ['split'] }));

			expect(validate({ $type: 'split', panes: [pane, pane] })).toBe(true);
			expect(validate({ $type: 'split', panes: [{ $type: 'other' }, pane] })).toBe(false);
		});
	});

	describe('Scenario: An owner $type outside the anchor grammar still gets valid anchors', () => {
		it.each(['ui/button', '1abc', 'a b', '_x', 'café', 'a__b'])(
			'compiles the anchors a schema of %j declares',
			($type) => {
				const nodes = createRegistry('Node', [
					handWritten(
						{
							type: 'object',
							properties: { a: { $anchor: 'node', type: 'string' }, b: { $ref: '#node' } },
						},
						undefined,
						$type,
					),
				]);
				const document = exportTreeSchema(nodes);
				const anchor = (properties(document, $type).a as { $anchor: string }).$anchor;

				expect(anchor).toMatch(/^[A-Za-z][-A-Za-z0-9._]*$/);
				expect(properties(document, $type).b).toEqual({ $ref: `#${anchor}` });
				const validate = compileJSONSchema(document);
				expect(validate({ a: 'x', b: 'y' })).toBe(true);
				expect(validate({ a: 1 })).toBe(false);
			},
		);

		it('gives two $types that differ only by an invalid character different anchors', () => {
			const schema = {
				type: 'object',
				properties: { a: { $anchor: 'node', type: 'string' }, b: { $ref: '#node' } },
			};
			const document = exportTreeSchema(
				createRegistry('Node', [
					handWritten(schema, undefined, 'ui/button'),
					handWritten(schema, undefined, 'ui button'),
					handWritten(schema, undefined, 'ui_2f_button'),
				]),
			);

			const anchors = ['ui/button', 'ui button', 'ui_2f_button'].map(
				($type) => (properties(document, $type).a as { $anchor: string }).$anchor,
			);
			expect(new Set(anchors).size).toBe(3);
			expect(() => compileJSONSchema(document)).not.toThrow();
		});

		it('keeps the anchors of a valid owner as they are', () => {
			const document = exportTreeSchema(
				createRegistry('Node', [
					handWritten({ type: 'object', properties: { a: { $anchor: 'node' } } }, undefined, 'my_button.v2'),
				]),
			);

			expect(properties(document, 'my_button.v2').a).toEqual({ $anchor: 'my_button.v2-node' });
		});
	});

	describe('Scenario: A tree that forms could export', () => {
		const containers: ExportSchemaContext['io'][] = ['input', 'output'];
		const elements = createRegistry('Element', [
			{
				$type: 'fieldset',
				schema: z.object({
					$type: typed('fieldset'),
					legend: z.optional(z.string()),
					elements: z.array(z.looseObject({ $type: z.string() })).check(z.minLength(1)),
				}),
				metadata,
				childPaths: [{ keys: ['elements'] }],
			},
			{ $type: 'input', schema: z.object({ $type: typed('input'), name: z.string() }), metadata },
			{ $type: 'checkbox', schema: z.object({ $type: typed('checkbox'), name: z.string() }), metadata },
		]);

		it.each(containers)('replaces the loose element schema of %s by the union of every element', (io) => {
			const document = exportTreeSchema(elements, { resolve: zodFirst, io });
			const every = union('fieldset', 'input', 'checkbox');

			expect(properties(document, 'fieldset').elements).toEqual({ type: 'array', items: every, minItems: 1 });
			expect(document.anyOf).toEqual(every.anyOf);
		});
	});

	describe('Scenario: A JSON Schema validator reads the document as safeParseTree reads the tree', () => {
		const page = {
			$type: 'page',
			title: 'Home',
			sections: [
				{
					$type: 'section',
					widgets: [
						{ $type: 'chart', metric: 'cpu' },
						{ $type: 'text', value: 'Hello' },
					],
					aside: { header: { $type: 'text', value: 'Aside' } },
					nested: [{ $type: 'section', nested: [{ $type: 'section' }] }],
				},
			],
		};

		it.each(['draft-2020-12', 'draft-07'] as const)(
			'accepts a valid tree and refuses a wrong child (%s)',
			(target) => {
				const validate = compileJSONSchema(
					exportTreeSchema(zodNodes, { resolve: zodFirst, target, accepts: ['page'] }),
				);

				expect(validate(page)).toBe(true);
				expect(validate({ ...page, sections: [{ $type: 'chart', metric: 'cpu' }] })).toBe(false);
				expect(validate({ ...page, sections: [{ $type: 'section', widgets: [{ $type: 'section' }] }] })).toBe(
					false,
				);
				expect(
					validate({ ...page, sections: [{ $type: 'section', aside: { header: { $type: 'chart' } } }] }),
				).toBe(false);
				expect(validate({ $type: 'frame' })).toBe(false);
			},
		);

		it('keeps the bounds and requiredness of the parent schema', () => {
			const validate = compileJSONSchema(exportTreeSchema(zodNodes, { resolve: zodFirst }));

			expect(validate({ $type: 'page', sections: [] })).toBe(false);
			expect(validate({ $type: 'page', sections: Array.from({ length: 6 }, () => ({ $type: 'section' })) })).toBe(
				false,
			);
			expect(validate({ $type: 'page' })).toBe(false);
		});

		it('takes a child or a list of children of any $type in an open slot', () => {
			const validate = compileJSONSchema(exportTreeSchema(zodNodes, { resolve: zodFirst }));

			expect(validate({ $type: 'frame', content: { $type: 'text', value: 'One' } })).toBe(true);
			expect(validate({ $type: 'frame', content: [{ $type: 'text', value: 'One' }, page] })).toBe(true);
			expect(validate({ $type: 'frame', content: { $type: 'nope' } })).toBe(false);
		});
	});
});
