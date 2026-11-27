import { describe, expectTypeOf, it } from 'vitest';
import * as z from 'zod/mini';
import {
	createRegistry,
	safeParseTree,
	type BaseRegistration,
	type ParseOptions,
	type ReadOnlyRegistry,
	type RegistryIssue,
} from '../../src';

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
			aside: z.optional(z.object({ header: z.looseObject({ $type: z.string() }) })),
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

type NodeType = 'page' | 'section' | 'chart' | 'text' | 'frame';

describe('the root', () => {
	it('narrows from a literal accepts, and the data of a node is typed per child path', () => {
		const result = safeParseTree(nodes, {}, { accepts: ['page'] });
		if (!result.success) return;

		const page = result.tree.data;
		expectTypeOf(page.$type).toEqualTypeOf<'page'>();
		expectTypeOf(page.title).toEqualTypeOf<string>();
		const section = page.sections[0]!;
		expectTypeOf(section.$type).toEqualTypeOf<'section'>();
		const widget = section.widgets?.[0];
		expectTypeOf(widget!.$type).toEqualTypeOf<'chart' | 'text'>();
		if (widget?.$type === 'text') expectTypeOf(widget.value).toEqualTypeOf<string>();
		expectTypeOf(section.aside!.header.$type).toEqualTypeOf<'text'>();
	});

	it('types recursion two levels deep, through a registration that accepts itself', () => {
		const result = safeParseTree(nodes, {}, { accepts: ['page'] });
		if (!result.success) return;

		const deep = result.tree.data.sections[0]!.nested?.[0]?.nested?.[0]?.widgets?.[0];
		expectTypeOf(deep!.$type).toEqualTypeOf<'chart' | 'text'>();
	});

	it('does not narrow from an options type that only may have accepts, from { path } or from no options', () => {
		const maybe: ParseOptions<'page'> = {};
		const widened = safeParseTree(nodes, {}, maybe);
		const none = safeParseTree(nodes, {});
		const pathOnly = safeParseTree(nodes, {}, { path: ['doc'] });

		if (widened.success) expectTypeOf(widened.tree.$type).toEqualTypeOf<NodeType>();
		if (none.success) expectTypeOf(none.tree.$type).toEqualTypeOf<NodeType>();
		if (pathOnly.success) expectTypeOf(pathOnly.tree.$type).toEqualTypeOf<NodeType>();
	});

	it('keeps a usable tree for a lookup typed by a widened $type, with a root accepts', () => {
		const widened: ReadOnlyRegistry<BaseRegistration> = nodes;
		const result = safeParseTree(widened, {}, { accepts: ['page'] });

		if (result.success) {
			expectTypeOf(result.tree.$type).toEqualTypeOf<string>();
			expectTypeOf(result.tree.data).not.toBeNever();
		}
	});

	it('keeps a widened registration beside the literal ones a root accepts names', () => {
		const widget: BaseRegistration = {
			$type: 'widget' as string,
			schema: z.object({ $type: z.string(), value: z.number() }),
			metadata: { name: 'Widget' },
		};
		const mixed = createRegistry('Mixed', [
			{
				$type: 'page',
				schema: z.object({ $type: z.literal('page'), title: z.string() }),
				metadata: { name: 'Page' },
			},
			widget,
		]);
		const result = safeParseTree(mixed, {}, { accepts: ['page', 'widget'] });

		if (result.success) {
			expectTypeOf(result.tree.$type).toEqualTypeOf<'page' | string>();
			// @ts-expect-error the root may be the widened widget, whose data has no title
			result.tree.data.title.toUpperCase();
		}
	});

	it('keeps a registration whose $type is a union of names when one of them is accepted', () => {
		const either: BaseRegistration & { $type: 'page' | 'widget' } = {
			$type: 'page',
			schema: z.object({ $type: z.enum(['page', 'widget']), title: z.string() }),
			metadata: { name: 'Either' },
		};
		const unioned = createRegistry('Unioned', [either]);
		const result = safeParseTree(unioned, {}, { accepts: ['page'] });

		if (result.success) {
			expectTypeOf(result.tree).not.toBeNever();
			expectTypeOf(result.tree.$type).toEqualTypeOf<'page' | 'widget'>();
		}
	});

	it('rejects an accepts name the lookup lacks', () => {
		// @ts-expect-error 'pgae' is no $type of the registry
		safeParseTree(nodes, {}, { accepts: ['pgae'] });
	});

	it('reports issues typed as RegistryIssue', () => {
		const result = safeParseTree(nodes, {});
		if (!result.success) expectTypeOf(result.issues).toEqualTypeOf<RegistryIssue[]>();
	});
});

describe('a slot typed unknown or nullable', () => {
	it('keeps undefined on an unknown slot', () => {
		const result = safeParseTree(nodes, {}, { accepts: ['frame'] });
		if (!result.success) return;

		type Content = typeof result.tree.data.content;
		expectTypeOf<undefined extends Content ? true : false>().toEqualTypeOf<true>();
		expectTypeOf<Extract<Content, { $type: 'chart' }>['metric']>().toEqualTypeOf<string>();
		expectTypeOf<Extract<Content, readonly unknown[]>>().not.toBeNever();
	});

	it('drops null from a nullable slot, since null at a child path is an issue', () => {
		const nullable = createRegistry('N', [
			{
				$type: 'list',
				schema: z.object({ $type: z.literal('list'), items: z.nullable(z.array(z.unknown())) }),
				metadata: { name: 'List' },
				childPaths: [{ keys: ['items'], accepts: ['text'] }],
			},
			{ $type: 'text', schema: textSchema, metadata: { name: 'Text' } },
		]);
		const result = safeParseTree(nullable, {}, { accepts: ['list'] });
		if (!result.success) return;

		expectTypeOf(result.tree.data.items[0]!.$type).toEqualTypeOf<'text'>();
		expectTypeOf(result.tree.data.items).toEqualTypeOf<{ $type: 'text'; value: string }[]>();
	});
});

describe('two registries in one lookup', () => {
	const layouts = createRegistry('Layout', [
		{
			$type: 'machine-layout',
			schema: z.object({
				$type: z.literal('machine-layout'),
				slots: z.object({ controls: z.array(z.unknown()) }),
			}),
			metadata: { name: 'Machine layout' },
			childPaths: [{ keys: ['slots', 'controls'], accepts: ['knob'] }],
		},
	]);
	const components = createRegistry('Component', [
		{
			$type: 'knob',
			schema: z.object({ $type: z.literal('knob'), value: z.number() }),
			metadata: { name: 'Knob' },
		},
	]);
	const both = { get: (type: string) => layouts.get(type) ?? components.get(type) };

	it('types a child of the other registry through the composed lookup', () => {
		const result = safeParseTree(both, {}, { accepts: ['machine-layout'] });
		if (!result.success) return;

		expectTypeOf(result.tree.data.slots.controls[0]!.value).toEqualTypeOf<number>();
	});

	it('errors, naming the type, for a lookup that lacks an accepted $type', () => {
		// @ts-expect-error the layout accepts 'knob', which this lookup does not have (acceptsUnknownType: 'knob')
		safeParseTree(layouts, {});
	});
});

describe('a registration whose output declares no $type', () => {
	it('errors, naming the type, since a tree schema keeps $type', () => {
		const noType = createRegistry('T', [
			{ $type: 'card', schema: z.object({ title: z.string() }), metadata: { name: 'Card' } },
		]);

		// @ts-expect-error the output of 'card' declares no $type (schemaOutputWithoutType: 'card')
		safeParseTree(noType, {});
	});
});

describe('widened declarations', () => {
	it('give data of unknown, with no error and no blow-up', () => {
		const wideReg: BaseRegistration = {
			$type: 'list',
			schema: z.object({ $type: z.literal('list'), items: z.array(z.unknown()) }),
			metadata: { name: 'List' },
			childPaths: [{ keys: ['items'], accepts: ['item'] }],
		};
		const wide = createRegistry('Wide', [wideReg]);
		const result = safeParseTree(wide, {});
		if (result.success) expectTypeOf(result.tree.data).toEqualTypeOf<unknown>();
	});

	it('give data of unknown for a registry typed BaseRegistration', () => {
		const loose = nodes as ReadOnlyRegistry<BaseRegistration>;
		const result = safeParseTree(loose, {});
		if (result.success) expectTypeOf(result.tree.data).toEqualTypeOf<unknown>();
	});

	it('type a registration declared apart with as const satisfies BaseRegistration', () => {
		const list = {
			$type: 'list',
			schema: z.object({ $type: z.literal('list'), items: z.array(z.unknown()) }),
			metadata: { name: 'List' },
			childPaths: [{ keys: ['items'], accepts: ['item'] }],
		} as const satisfies BaseRegistration;
		const item = {
			$type: 'item',
			schema: z.object({ $type: z.literal('item'), label: z.string() }),
			metadata: { name: 'Item' },
		} as const satisfies BaseRegistration;
		const lists = createRegistry('List', [list, item]);
		const result = safeParseTree(lists, {}, { accepts: ['list'] });
		if (!result.success) return;

		expectTypeOf(result.tree.data.items[0]!.label).toEqualTypeOf<string>();
	});
});

describe('children', () => {
	it('types the nodes of each entry by its accepts', () => {
		const result = safeParseTree(nodes, {}, { accepts: ['page'] });
		if (!result.success) return;

		const entry = result.tree.children[0];
		expectTypeOf(entry.keys).toEqualTypeOf<readonly ['sections']>();
		expectTypeOf(entry.nodes[0]!.$type).toEqualTypeOf<'section'>();
		const sectionChildren = entry.nodes[0]!.children;
		expectTypeOf(sectionChildren[0].nodes[0]!.$type).toEqualTypeOf<'chart' | 'text'>();
		expectTypeOf(sectionChildren[1].nodes[0]!.$type).toEqualTypeOf<'text'>();
	});

	it('is an empty tuple for a registration with no child path', () => {
		const result = safeParseTree(nodes, {}, { accepts: ['chart'] });
		if (!result.success) return;

		expectTypeOf(result.tree.children).toEqualTypeOf<readonly []>();
	});

	it('is a list of entries for a widened registry', () => {
		const loose = nodes as ReadOnlyRegistry<BaseRegistration>;
		const result = safeParseTree(loose, {});
		if (!result.success) return;

		expectTypeOf(result.tree.children).toExtend<readonly { keys: readonly string[] }[]>();
	});
});
