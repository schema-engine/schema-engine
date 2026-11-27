import type { StandardSchemaV1 } from '@standard-schema/spec';
import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';
import {
	RegistryError,
	createRegistry,
	formatIssuePath,
	safeParseNode,
	safeParseTree,
	type BaseRegistration,
	type NodeLookup,
	type RegistryIssue,
} from '../src';

const chartSchema = z.object({ $type: z.literal('chart'), metric: z.string() });
const textSchema = z.object({ $type: z.literal('text'), value: z._default(z.string(), '') });

const nodes = createRegistry('Node', [
	{
		$type: 'page',
		schema: z.object({
			$type: z.literal('page'),
			title: z._default(z.string(), 'Untitled'),
			sections: z.array(z.unknown()),
		}),
		metadata: { name: 'Page' },
		childPaths: [{ keys: ['sections'], accepts: ['section'] }],
	},
	{
		$type: 'section',
		schema: z.object({
			$type: z.literal('section'),
			widgets: z.optional(z.array(z.unknown())),
			aside: z.optional(z.object({ header: z.unknown() })),
			nested: z.optional(z.array(z.unknown())),
		}),
		metadata: { name: 'Section' },
		childPaths: [
			{ keys: ['widgets'], accepts: ['chart', 'text'] },
			{ keys: ['aside', 'header'], accepts: ['text'] },
			{ keys: ['nested'], accepts: ['section'] },
		],
	},
	{ $type: 'chart', schema: chartSchema, metadata: { name: 'Chart' } },
	{ $type: 'text', schema: textSchema, metadata: { name: 'Text' } },
	{
		$type: 'frame',
		schema: z.object({ $type: z.literal('frame'), content: z.optional(z.unknown()) }),
		metadata: { name: 'Frame' },
		childPaths: [{ keys: ['content'] }],
	},
]);

function treeOf<TTree>(result: { success: true; tree: TTree } | { success: false; issues: RegistryIssue[] }): TTree {
	if (!result.success) throw new Error(`Expected a tree, got ${JSON.stringify(result.issues)}`);
	return result.tree;
}

function issuesOf(result: { success: true } | { success: false; issues: RegistryIssue[] }): RegistryIssue[] {
	if (result.success) throw new Error('Expected issues, got a tree');
	return result.issues;
}

function thrown(run: () => unknown): unknown {
	try {
		run();
	} catch (error) {
		return error;
	}
	throw new Error('Expected the call to throw');
}

/**
 * A schema that hands the input to `transform`, so a test can write the output a registration's contract forbids,
 * which a typed schema library would not let it declare.
 */
function schemaOf(transform: (input: Record<string, unknown>) => unknown): StandardSchemaV1 {
	return {
		'~standard': {
			version: 1,
			vendor: 'test',
			validate: (value) => ({ value: transform(value as Record<string, unknown>) }),
		},
	};
}

function deepFreeze<T>(value: T): T {
	if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
		Object.freeze(value);
		for (const entry of Object.values(value)) deepFreeze(entry);
	}
	return value;
}

const document = {
	$type: 'page',
	sections: [
		{ $type: 'section', widgets: [{ $type: 'chart', metric: 'cpu' }, { $type: 'text' }] },
		{ $type: 'section', aside: { header: { $type: 'text', value: 'Hi' } } },
	],
};

describe('safeParseTree', () => {
	describe('Scenario: the root says what it accepts', () => {
		it('passes a root the list names', () => {
			const result = safeParseTree(nodes, document, { accepts: ['page'] });

			expect(treeOf(result).$type).toBe('page');
		});

		it('gives a root outside the list the issue registry/not-accepted at its $type, with expected and received', () => {
			const result = safeParseTree(nodes, { $type: 'chart', metric: 'cpu' }, { accepts: ['page'] });

			expect(issuesOf(result)).toEqual([
				{
					code: 'registry/not-accepted',
					message: "$type 'chart' is not accepted here. Expected 'page'.",
					path: ['$type'],
					expected: ['page'],
					received: 'chart',
				},
			]);
		});

		it('prefixes every issue with the path option', () => {
			const broken = { $type: 'page', sections: [{ $type: 'chart', metric: 1 }, 7] };
			const result = safeParseTree(nodes, broken, { accepts: ['page'], path: ['doc'] });

			expect(issuesOf(result).map((issue) => issue.path)).toEqual([
				['doc', 'sections', 0, '$type'],
				['doc', 'sections', 1],
			]);
			const rootless = safeParseTree(
				nodes,
				{ $type: 'chart', metric: 'x' },
				{ accepts: ['page'], path: ['doc'] },
			);
			expect(issuesOf(rootless)[0]?.path).toEqual(['doc', '$type']);
		});

		it('throws for an empty accepts, a caller bug', () => {
			expect(() => safeParseTree(nodes, document, { accepts: [] as never })).toThrow(
				'accepts must name at least one $type.',
			);
		});
	});

	describe('Scenario: a slot says what it accepts', () => {
		it('rejects a $type outside the list at the position of the child, whatever its schema', () => {
			const result = safeParseTree(nodes, { $type: 'page', sections: [{ $type: 'page', sections: [] }] });

			expect(issuesOf(result)).toEqual([
				{
					code: 'registry/not-accepted',
					message: "$type 'page' is not accepted here. Expected 'section'.",
					path: ['sections', 0, '$type'],
					expected: ['section'],
					received: 'page',
				},
			]);
		});

		it('names the whole list when it has several $types', () => {
			const broken = {
				$type: 'page',
				sections: [{ $type: 'section', widgets: [{ $type: 'text' }, { $type: 'chip' }] }],
			};
			const result = safeParseTree(nodes, broken);

			expect(issuesOf(result)).toEqual([
				{
					code: 'registry/not-accepted',
					message: "$type 'chip' is not accepted here. Expected one of 'chart', 'text'.",
					path: ['sections', 0, 'widgets', 1, '$type'],
					expected: ['chart', 'text'],
					received: 'chip',
				},
			]);
		});

		it('keeps registry/unregistered-type for an accepted $type nothing registers', () => {
			const ghosts = createRegistry('Ghost', [
				{
					$type: 'box',
					schema: z.object({ $type: z.literal('box'), content: z.unknown() }),
					metadata: { name: 'Box' },
					childPaths: [{ keys: ['content'], accepts: ['ghost'] }],
				},
			]);
			const result = safeParseTree(ghosts as NodeLookup<BaseRegistration>, {
				$type: 'box',
				content: { $type: 'ghost' },
			});

			expect(issuesOf(result)).toEqual([
				{
					code: 'registry/unregistered-type',
					message: "No registration for $type 'ghost'.",
					path: ['content', '$type'],
					received: 'ghost',
				},
			]);
		});

		it('takes any $type the lookup answers when there is no accepts', () => {
			const chart = treeOf(safeParseTree(nodes, { $type: 'frame', content: { $type: 'chart', metric: 'cpu' } }));
			const text = treeOf(safeParseTree(nodes, { $type: 'frame', content: { $type: 'text' } }));

			expect(chart.children[0]?.nodes[0]?.$type).toBe('chart');
			expect(text.children[0]?.nodes[0]?.$type).toBe('text');
			expect(issuesOf(safeParseTree(nodes, { $type: 'frame', content: { $type: 'chip' } }))[0]).toMatchObject({
				code: 'registry/unregistered-type',
				path: ['content', '$type'],
			});
		});

		it('checks accepts before the lookup, so a typo names what would fit', () => {
			const result = safeParseTree(nodes, { $type: 'page', sections: [{ $type: 'sectoin' }] });

			expect(issuesOf(result)[0]).toMatchObject({
				code: 'registry/not-accepted',
				expected: ['section'],
				received: 'sectoin',
			});
		});

		it('keeps the issues for a missing or non-string $type and a node that is not an object', () => {
			const result = safeParseTree(nodes, { $type: 'page', sections: [{}, { $type: 7 }, null] });

			expect(issuesOf(result).map(({ code, path }) => ({ code, path }))).toEqual([
				{ code: 'registry/missing-type', path: ['sections', 0, '$type'] },
				{ code: 'registry/missing-type', path: ['sections', 1, '$type'] },
				{ code: 'registry/not-an-object', path: ['sections', 2] },
			]);
		});
	});

	describe('Scenario: the value at a child path', () => {
		const framed = (content: unknown) => safeParseTree(nodes, { $type: 'frame', content });

		it('is no children when the key is absent, and data keeps what the schema returned there', () => {
			const defaults = createRegistry('Default', [
				{
					$type: 'list',
					schema: z.object({ $type: z.literal('list'), items: z._default(z.array(z.unknown()), []) }),
					metadata: { name: 'List' },
					childPaths: [{ keys: ['items'] }],
				},
			]);
			const tree = treeOf(safeParseTree(defaults, { $type: 'list' }));

			expect(tree.children).toEqual([{ keys: ['items'], nodes: [] }]);
			expect(tree.data).toEqual({ $type: 'list', items: [] });
			expect(treeOf(safeParseTree(nodes, { $type: 'frame' })).data).toEqual({ $type: 'frame' });
		});

		it.each([
			['absent', {}],
			['not an object', { aside: 5 }],
			['an array', { aside: [] }],
			['null', { aside: null }],
		])('is no children when an intermediate is %s', (_name, extra) => {
			const sides = createRegistry('Side', [
				{
					$type: 'panel',
					schema: schemaOf((input) => ({ ...input })),
					metadata: { name: 'Panel' },
					childPaths: [{ keys: ['aside', 'header'] }],
				},
			]);
			const document = { $type: 'panel', ...extra };
			const tree = treeOf(safeParseTree(sides, document));

			expect(tree.children).toEqual([{ keys: ['aside', 'header'], nodes: [] }]);
			expect(tree.data).toEqual(document);
		});

		it('is no children when the value is undefined, as when absent', () => {
			const tree = treeOf(framed(undefined));

			expect(tree.children).toEqual([{ keys: ['content'], nodes: [] }]);
		});

		it('is the issue registry/not-a-node at the path for null', () => {
			expect(issuesOf(framed(null))).toEqual([
				{ code: 'registry/not-a-node', message: 'Expected a node or a list of nodes.', path: ['content'] },
			]);
		});

		it.each(['text', 7, true])('is the issue registry/not-a-node at the path for the primitive %j', (value) => {
			expect(issuesOf(framed(value))).toEqual([
				{ code: 'registry/not-a-node', message: 'Expected a node or a list of nodes.', path: ['content'] },
			]);
		});

		it('is one child, walked, for an object', () => {
			const tree = treeOf(framed({ $type: 'chart', metric: 'cpu' }));

			expect(tree.children).toEqual([
				{
					keys: ['content'],
					nodes: [
						expect.objectContaining({
							$type: 'chart',
							path: ['content'],
							data: { $type: 'chart', metric: 'cpu' },
						}),
					],
				},
			]);
			expect(tree.data).toEqual({ $type: 'frame', content: { $type: 'chart', metric: 'cpu' } });
		});

		it('is a child for each item of an array, at the index in its path, and data holds an array', () => {
			const tree = treeOf(framed([{ $type: 'chart', metric: 'a' }, { $type: 'text' }]));

			expect(tree.children[0]?.nodes.map((child) => child.path)).toEqual([
				['content', 0],
				['content', 1],
			]);
			expect(tree.data).toEqual({
				$type: 'frame',
				content: [
					{ $type: 'chart', metric: 'a' },
					{ $type: 'text', value: '' },
				],
			});
		});

		it('walks an object that is not plain, the schema passing it through, into the issue of safeParseNode', () => {
			expect(issuesOf(framed(new Map()))).toEqual([
				{ code: 'registry/missing-type', message: 'Expected a string $type.', path: ['content', '$type'] },
			]);
		});

		it('leaves an item that is not an object to the issue of safeParseNode', () => {
			expect(issuesOf(framed([{ $type: 'text' }, 3]))).toEqual([
				{
					code: 'registry/not-an-object',
					message: 'Expected an object with a string $type.',
					path: ['content', 1],
				},
			]);
		});

		it('reports a hole in a sparse array as the item it stands for, not as a silent failure', () => {
			const sparse: unknown[] = [];
			sparse[1] = { $type: 'text' };

			expect(issuesOf(framed(sparse))).toEqual([
				{
					code: 'registry/not-an-object',
					message: 'Expected an object with a string $type.',
					path: ['content', 0],
				},
			]);
		});

		it('walks an array longer than the engine allows as call arguments', () => {
			const items = Array.from({ length: 200_000 }, () => ({ $type: 'text' }));
			const tree = treeOf(framed(items));

			expect(tree.children[0]?.nodes).toHaveLength(items.length);
		});

		it('is no children for an empty array, and data holds []', () => {
			const tree = treeOf(framed([]));

			expect(tree.children).toEqual([{ keys: ['content'], nodes: [] }]);
			expect(tree.data).toEqual({ $type: 'frame', content: [] });
		});

		it('is absent when the key is only on the prototype', () => {
			const boxes = createRegistry('Box', [
				{
					$type: 'box',
					schema: schemaOf((input) => ({ ...input })),
					metadata: { name: 'Box' },
					childPaths: [{ keys: ['constructor'] }, { keys: ['toString'] }],
				},
			]);
			const tree = treeOf(safeParseTree(boxes, { $type: 'box' }));

			expect(tree.children).toEqual([
				{ keys: ['constructor'], nodes: [] },
				{ keys: ['toString'], nodes: [] },
			]);
		});

		it('reads and writes an own key __proto__ as an own property', () => {
			const passThrough = schemaOf((input) => ({ ...input }));
			const boxes = createRegistry('Box', [
				{ $type: 'box', schema: passThrough, metadata: { name: 'Box' }, childPaths: [{ keys: ['__proto__'] }] },
				{ $type: 'chart', schema: chartSchema, metadata: { name: 'Chart' } },
			]);
			const authored: unknown = JSON.parse('{"$type":"box","__proto__":{"$type":"chart","metric":"cpu"}}');
			const tree = treeOf(safeParseTree(boxes, authored));

			expect(tree.children[0]?.keys).toEqual(['__proto__']);
			expect(tree.children[0]?.nodes[0]?.$type).toBe('chart');
			const data = tree.data as Record<string, unknown>;
			expect(Object.hasOwn(data, '__proto__')).toBe(true);
			expect(Object.getOwnPropertyDescriptor(data, '__proto__')?.value).toBe(tree.children[0]?.nodes[0]?.data);
			expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
		});
	});

	describe('Scenario: two registries in one lookup', () => {
		const layouts = createRegistry('Layout', [
			{
				$type: 'machine-layout',
				schema: z.object({
					$type: z.literal('machine-layout'),
					blocks: z.object({ engine: z.object({ controls: z.array(z.unknown()) }) }),
				}),
				metadata: { name: 'Machine layout' },
				childPaths: [{ keys: ['blocks', 'engine', 'controls'], accepts: ['component', 'engine-controls'] }],
			},
		]);
		const slotNodes = createRegistry('SlotNode', [
			{
				$type: 'component',
				schema: z.object({ $type: z.literal('component'), name: z.string() }),
				metadata: { name: 'Component' },
			},
			{
				$type: 'engine-controls',
				schema: z.object({ $type: z.literal('engine-controls'), gain: z._default(z.number(), 1) }),
				metadata: { name: 'Engine controls' },
			},
		]);
		const lookup = { get: (type: string) => layouts.get(type) ?? slotNodes.get(type) };
		const machine = (controls: unknown[]) => ({
			$type: 'machine-layout',
			blocks: { engine: { controls } },
		});

		it('validates a document of both in one call, with the data typed through the slot', () => {
			const parsed = safeParseTree(
				lookup,
				machine([{ $type: 'component', name: 'knob' }, { $type: 'engine-controls' }]),
				{
					accepts: ['machine-layout'],
				},
			);
			const tree = treeOf(parsed);

			expect(tree.data.blocks.engine.controls).toEqual([
				{ $type: 'component', name: 'knob' },
				{ $type: 'engine-controls', gain: 1 },
			]);
		});

		it('reports a machine-layout in a slot and a component root as issues', () => {
			const nested = safeParseTree(lookup, machine([machine([])]), { accepts: ['machine-layout'] });
			const root = safeParseTree(lookup, { $type: 'component', name: 'knob' }, { accepts: ['machine-layout'] });

			expect(issuesOf(nested)[0]).toMatchObject({
				code: 'registry/not-accepted',
				path: ['blocks', 'engine', 'controls', 0, '$type'],
				expected: ['component', 'engine-controls'],
				received: 'machine-layout',
			});
			expect(issuesOf(root)[0]).toMatchObject({
				code: 'registry/not-accepted',
				path: ['$type'],
				expected: ['machine-layout'],
				received: 'component',
			});
		});
	});

	describe('Scenario: data is the parsed document', () => {
		const docs = createRegistry('Doc', [
			{
				$type: 'page',
				schema: z.object({
					$type: z.literal('page'),
					title: z._default(z.string(), 'Untitled'),
					sections: z._default(z.array(z.unknown()), []),
				}),
				metadata: { name: 'Page' },
				childPaths: [{ keys: ['sections'], accepts: ['section'] }],
			},
			{
				$type: 'section',
				schema: z.object({
					$type: z.literal('section'),
					title: z._default(z.string(), 'Untitled'),
					rows: z.optional(z.array(z.unknown())),
				}),
				metadata: { name: 'Section' },
				childPaths: [{ keys: ['rows'], accepts: ['row'] }],
			},
			{
				$type: 'row',
				schema: z.object({
					$type: z.literal('row'),
					label: z.pipe(
						z.string(),
						z.transform((value) => value.toUpperCase()),
					),
				}),
				metadata: { name: 'Row' },
			},
		]);

		it('applies the defaults and transforms of every level', () => {
			const tree = treeOf(
				safeParseTree(docs, {
					$type: 'page',
					sections: [{ $type: 'section', rows: [{ $type: 'row', label: 'a' }] }, { $type: 'section' }],
				}),
			);

			expect(tree.data).toEqual({
				$type: 'page',
				title: 'Untitled',
				sections: [
					{ $type: 'section', title: 'Untitled', rows: [{ $type: 'row', label: 'A' }] },
					{ $type: 'section', title: 'Untitled' },
				],
			});
		});

		it('keeps a default that holds no node when the document leaves the slot out', () => {
			expect(treeOf(safeParseTree(docs, { $type: 'page' })).data).toEqual({
				$type: 'page',
				title: 'Untitled',
				sections: [],
			});
		});

		it('gives the root data and the data of a child as the same object the parent holds at that position', () => {
			const tree = treeOf(
				safeParseTree(docs, {
					$type: 'page',
					sections: [{ $type: 'section', rows: [{ $type: 'row', label: 'a' }] }],
				}),
			);
			const section = tree.children[0]!.nodes[0]!;
			const row = section.children[0]!.nodes[0];

			expect((tree.data as { sections: unknown[] }).sections[0]).toBe(section.data);
			expect((section.data as { rows: unknown[] }).rows[0]).toBe(row?.data);
		});

		it('writes into a copy: the authored document and the schema output are not mutated', () => {
			const outputs: unknown[] = [];
			const recording = (schema: StandardSchemaV1): StandardSchemaV1 => ({
				'~standard': {
					version: 1,
					vendor: 'test',
					validate: (value) => {
						const result = schema['~standard'].validate(value) as { value: unknown };
						outputs.push(deepFreeze(result.value));
						return result;
					},
				},
			});
			const loose = createRegistry('Loose', [
				{
					$type: 'list',
					schema: recording(schemaOf((input) => ({ ...input }))),
					metadata: { name: 'List' },
					childPaths: [{ keys: ['items'] }],
				},
				{
					$type: 'item',
					schema: recording(
						z.looseObject({ $type: z.literal('item'), label: z._default(z.string(), 'none') }),
					),
					metadata: { name: 'Item' },
				},
			]);
			const authored = deepFreeze({ $type: 'list', items: [{ $type: 'item' }] });
			const snapshot = structuredClone(authored);
			const tree = treeOf(safeParseTree(loose, authored));

			expect(authored).toEqual(snapshot);
			expect(tree.data).toEqual({ $type: 'list', items: [{ $type: 'item', label: 'none' }] });
			expect(tree.data).not.toBe(outputs[0]);
			expect(outputs[0]).toEqual({ $type: 'list', items: [{ $type: 'item' }] });
			expect((outputs[0] as { items: unknown[] }).items).toBe(authored.items);
		});

		it('copies the objects of a shared prefix once, so every path keeps its child', () => {
			const panels = createRegistry('Panel', [
				{
					$type: 'panel',
					schema: z.object({
						$type: z.literal('panel'),
						aside: z.object({ header: z.unknown(), footer: z.unknown(), note: z.string() }),
					}),
					metadata: { name: 'Panel' },
					childPaths: [{ keys: ['aside', 'header'] }, { keys: ['aside', 'footer'] }],
				},
				{
					$type: 'text',
					schema: z.object({ $type: z.literal('text'), value: z._default(z.string(), '') }),
					metadata: { name: 'Text' },
				},
			]);
			const tree = treeOf(
				safeParseTree(
					panels,
					{
						$type: 'panel',
						aside: { header: { $type: 'text', value: 'h' }, footer: { $type: 'text' }, note: 'n' },
					},
					{ accepts: ['panel'] },
				),
			);

			expect(tree.data.aside).toEqual({
				header: { $type: 'text', value: 'h' },
				footer: { $type: 'text', value: '' },
				note: 'n',
			});
			expect(tree.data.aside.header).toBe(tree.children[0]?.nodes[0]?.data);
			expect(tree.data.aside.footer).toBe(tree.children[1]?.nodes[0]?.data);
		});

		it('returns the schema output itself for a node with no children to write', () => {
			const outputs: unknown[] = [];
			const spy = createRegistry('Spy', [
				{
					$type: 'leaf',
					schema: schemaOf((input) => {
						const output = { ...input };
						outputs.push(output);
						return output;
					}),
					metadata: { name: 'Leaf' },
				},
			]);

			expect(treeOf(safeParseTree(spy, { $type: 'leaf' })).data).toBe(outputs[0]);
		});
	});

	describe('Scenario: the schema of a parent keeps the structure of the registration', () => {
		const child = { $type: 'item', schema: z.object({ $type: z.literal('item') }), metadata: { name: 'Item' } };
		const registryWith = (transform: (input: Record<string, unknown>) => unknown, kind = 'Widget') =>
			createRegistry(kind, [
				{
					$type: 'list',
					schema: schemaOf(transform),
					metadata: { name: 'List' },
					childPaths: [{ keys: ['items'] }],
				},
				child,
			]);
		const filled = { $type: 'list', items: [{ $type: 'item' }, { $type: 'item' }] };

		it.each([
			['strips the child key', (input: Record<string, unknown>) => ({ $type: input.$type })],
			[
				'renames the child key',
				(input: Record<string, unknown>) => ({ $type: input.$type, entries: input.items }),
			],
			[
				'turns the array into an object',
				(input: Record<string, unknown>) => ({ ...input, items: { $type: 'item' } }),
			],
			['changes the length', (input: Record<string, unknown>) => ({ ...input, items: [{ $type: 'item' }] })],
			['turns the array into a string', (input: Record<string, unknown>) => ({ ...input, items: 'none' })],
		])('throws schema-breaks-child-path when the schema %s', (_name, transform) => {
			const error = thrown(() => safeParseTree(registryWith(transform), filled));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'schema-breaks-child-path',
				kind: 'Widget',
				$type: 'list',
				childPath: ['items'],
				message: "Widget 'list' schema output does not keep the child path 'items' as the document has it.",
			});
		});

		it('throws schema-breaks-child-path when an object slot becomes a list', () => {
			const frame = createRegistry('Widget', [
				{
					$type: 'frame',
					schema: schemaOf((input) => ({ ...input, content: [input.content] })),
					metadata: { name: 'Frame' },
					childPaths: [{ keys: ['content'] }],
				},
				child,
			]);

			expect(thrown(() => safeParseTree(frame, { $type: 'frame', content: { $type: 'item' } }))).toMatchObject({
				code: 'schema-breaks-child-path',
				childPath: ['content'],
			});
		});

		it('throws schema-breaks-child-path when an intermediate of a path is lost', () => {
			const aside = createRegistry('Widget', [
				{
					$type: 'panel',
					schema: schemaOf((input) => ({ $type: input.$type, aside: [] })),
					metadata: { name: 'Panel' },
					childPaths: [{ keys: ['aside', 'header'] }],
				},
				child,
			]);

			expect(
				thrown(() => safeParseTree(aside, { $type: 'panel', aside: { header: { $type: 'item' } } })),
			).toMatchObject({
				code: 'schema-breaks-child-path',
				$type: 'panel',
				childPath: ['aside', 'header'],
			});
		});

		it('throws schema-breaks-child-path for a default that holds a node, where the document has none', () => {
			const registry = registryWith((input) => ({ ...input, items: input.items ?? [{ $type: 'item' }] }));

			expect(thrown(() => safeParseTree(registry, { $type: 'list' }))).toMatchObject({
				code: 'schema-breaks-child-path',
				$type: 'list',
				childPath: ['items'],
				message: "Widget 'list' schema output does not keep the child path 'items' as the document has it.",
			});
		});

		it.each([
			['nothing', (input: Record<string, unknown>) => ({ $type: input.$type })],
			['undefined', (input: Record<string, unknown>) => ({ ...input, items: undefined })],
			['an empty list', (input: Record<string, unknown>) => ({ ...input, items: [] })],
		])('accepts %s where the document leaves the slot empty', (_name, transform) => {
			expect(safeParseTree(registryWith(transform), { $type: 'list' }).success).toBe(true);
		});

		it.each([
			['drops $type', (input: Record<string, unknown>) => ({ items: input.items })],
			['changes $type', (input: Record<string, unknown>) => ({ ...input, $type: 'other' })],
			['returns no object', () => 'list'],
		])('throws schema-changes-type when the schema %s', (_name, transform) => {
			const error = thrown(() => safeParseTree(registryWith(transform), filled));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'schema-changes-type',
				kind: 'Widget',
				$type: 'list',
				message: "Widget 'list' schema output must keep its $type 'list'.",
			});
		});

		it('checks a node with no child path as well, since $type is the contract of a tree schema', () => {
			const leaf = createRegistry('Widget', [
				{ $type: 'leaf', schema: schemaOf(() => ({})), metadata: { name: 'Leaf' } },
			]);

			expect(thrown(() => safeParseTree(leaf, { $type: 'leaf' }))).toMatchObject({ code: 'schema-changes-type' });
		});

		it('sets kind for a registry and leaves it out for a function lookup', () => {
			const registry = registryWith((input) => ({ $type: input.$type }));
			const viaRegistry = thrown(() => safeParseTree(registry, filled));
			const viaFunction = thrown(() => safeParseTree({ get: (type: string) => registry.get(type) }, filled));

			expect(viaRegistry).toMatchObject({ code: 'schema-breaks-child-path', kind: 'Widget' });
			expect(viaFunction).toBeInstanceOf(RegistryError);
			expect(viaFunction).toMatchObject({
				code: 'schema-breaks-child-path',
				$type: 'list',
				message: "'list' schema output does not keep the child path 'items' as the document has it.",
			});
			expect((viaFunction as RegistryError).kind).toBeUndefined();
		});

		it('leaves safeParseNode alone to accept an output without $type', () => {
			const registry = registryWith(() => ({}));

			expect(safeParseNode(registry, filled)).toMatchObject({ success: true, data: {} });
		});

		it('discards a transform of the parent at a filled slot, which the docs call opaque', () => {
			const registry = registryWith((input) => ({
				...input,
				items: [...(input.items as unknown[])].toReversed(),
			}));
			const tree = treeOf(
				safeParseTree(registry, {
					$type: 'list',
					items: [
						{ $type: 'item', n: 1 },
						{ $type: 'item', n: 2 },
					],
				}),
			);

			expect(tree.children[0]?.nodes.map((node) => node.path)).toEqual([
				['items', 0],
				['items', 1],
			]);
		});
	});

	describe('Scenario: children lists one entry per declared path', () => {
		it('holds an entry per path in declaration order, with empty nodes for an absent slot', () => {
			const tree = treeOf(safeParseTree(nodes, { $type: 'section', nested: [{ $type: 'section' }] }));

			expect(tree.children.map((entry) => ({ keys: entry.keys, count: entry.nodes.length }))).toEqual([
				{ keys: ['widgets'], count: 0 },
				{ keys: ['aside', 'header'], count: 0 },
				{ keys: ['nested'], count: 1 },
			]);
		});

		it('walks a registration that accepts itself, and a child is found by its keys', () => {
			const tree = treeOf(
				safeParseTree(nodes, {
					$type: 'section',
					nested: [{ $type: 'section', nested: [{ $type: 'section', widgets: [{ $type: 'text' }] }] }],
				}),
			);
			const entry = tree.children.find(({ keys }) => keys.join('.') === 'nested');
			const deepest = entry?.nodes[0]?.children.find(({ keys }) => keys.join('.') === 'nested')?.nodes[0];

			expect(deepest?.path).toEqual(['nested', 0, 'nested', 0]);
			expect(deepest?.children.find(({ keys }) => keys.join('.') === 'widgets')?.nodes[0]?.$type).toBe('text');
		});

		it('keeps the registration of each node, for a tool that reads its metadata', () => {
			const tree = treeOf(safeParseTree(nodes, document, { accepts: ['page'] }));

			expect(tree.registration).toBe(nodes.get('page'));
			expect(tree.children[0]?.nodes[0]?.registration).toBe(nodes.get('section'));
		});

		it('gives an object reached again through its own ancestors the issue registry/contains-itself at the repeat', () => {
			const loop: Record<string, unknown> = { $type: 'section', nested: [] };
			(loop.nested as unknown[]).push(loop);

			expect(issuesOf(safeParseTree(nodes, loop))).toEqual([
				{ code: 'registry/contains-itself', message: 'A node cannot contain itself.', path: ['nested', 0] },
			]);
		});

		it('parses the same object under two parents twice, which is no cycle', () => {
			const shared = { $type: 'text', value: 'x' };
			const tree = treeOf(safeParseTree(nodes, { $type: 'section', widgets: [shared, shared] }));

			expect(tree.children[0]?.nodes[0]?.data).not.toBe(tree.children[0]?.nodes[1]?.data);
			expect(tree.children[0]?.nodes).toHaveLength(2);
		});
	});

	describe('Scenario: every issue of a three-level document is reported at its full path', () => {
		const broken: unknown = JSON.parse(
			JSON.stringify({
				$type: 'page',
				sections: [
					{ $type: 'section', widgets: [{ $type: 'chart', metric: 5 }] },
					{
						$type: 'section',
						aside: { header: { $type: 'text', value: 1 } },
						widgets: [{ $type: 'chart', metric: 'ok' }, { $type: 'dial' }],
					},
				],
			}),
		);
		const result = safeParseTree(nodes, broken);

		it('collects the issues of every branch, siblings of a failing node included', () => {
			expect(issuesOf(result).map((issue) => issue.path)).toEqual([
				['sections', 0, 'widgets', 0, 'metric'],
				['sections', 1, 'widgets', 1, '$type'],
				['sections', 1, 'aside', 'header', 'value'],
			]);
		});

		it('writes the position of an issue with formatIssuePath', () => {
			const issue = issuesOf(result)[1];

			expect(formatIssuePath(issue?.path, broken)).toBe('sections[1].widgets[1].$type');
		});
	});

	describe('Scenario: issue codes', () => {
		it('gives each issue the engine creates its code, and a schema issue comes through unchanged', () => {
			const broken = {
				$type: 'page',
				sections: [
					null,
					{},
					{ $type: 'ghost' },
					{
						$type: 'section',
						widgets: [{ $type: 'chart', metric: 1 }],
						aside: { header: { $type: 'text' } },
					},
				],
			};
			const codes = issuesOf(safeParseTree(nodes, broken)).map((issue) => issue.code);

			expect(codes).toEqual([
				'registry/not-an-object',
				'registry/missing-type',
				'registry/not-accepted',
				'invalid_type',
			]);
			const schemaIssue = issuesOf(safeParseTree(nodes, broken))[3];
			const own = z.object({ $type: z.literal('chart'), metric: z.string() })['~standard'].validate({
				$type: 'chart',
				metric: 1,
			}) as { issues: StandardSchemaV1.Issue[] };
			expect(schemaIssue).toEqual({
				...own.issues[0],
				path: ['sections', 3, 'widgets', 0, ...(own.issues[0]?.path ?? [])],
			});
		});
	});

	describe('Scenario: a single node is checked on its own', () => {
		it('checks a node with safeParseNode as it did, ignoring childPaths', () => {
			expect(safeParseNode(nodes, { $type: 'page', sections: [{ $type: 'nothing' }] }).success).toBe(true);
		});
	});

	describe('Scenario: a schema that validates asynchronously', () => {
		it('throws, as for any other node', () => {
			const later = createRegistry('Later', [
				{
					$type: 'later',
					schema: {
						'~standard': {
							version: 1,
							vendor: 'test',
							validate: async () => ({ value: { $type: 'later' } }),
						},
					},
					metadata: { name: 'Later' },
				},
			]);

			expect(() => safeParseTree(later, { $type: 'later' })).toThrow('Async Standard Schema');
		});
	});
});
