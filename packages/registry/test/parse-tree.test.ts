import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';
import { createRegistry, formatIssuePath, safeParseNode, safeParseTree, type BaseRegistration } from '../src';

const layout: BaseRegistration = {
	$type: 'layout',
	schema: z.looseObject({
		$type: z.literal('layout'),
		blocks: z.optional(z.array(z.looseObject({ $type: z.string() }))),
	}),
	metadata: { name: 'Layout' },
	childPaths: [['blocks']],
};

const block: BaseRegistration = {
	$type: 'block',
	schema: z.looseObject({
		$type: z.literal('block'),
		title: z._default(z.string(), 'Untitled'),
		engine: z.optional(z.looseObject({ controls: z.optional(z.array(z.looseObject({ $type: z.string() }))) })),
	}),
	metadata: { name: 'Block' },
	childPaths: [['engine', 'controls']],
};

const knob: BaseRegistration = {
	$type: 'knob',
	schema: z.looseObject({ $type: z.literal('knob'), value: z.number() }),
	metadata: { name: 'Knob' },
};

const widgets = createRegistry('Widget', [layout, block, knob]);

const document = {
	$type: 'layout',
	blocks: [
		{ $type: 'block', title: 'One', engine: { controls: [{ $type: 'knob', value: 1 }] } },
		{
			$type: 'block',
			engine: {
				controls: [
					{ $type: 'knob', value: 2 },
					{ $type: 'knob', value: 3 },
				],
			},
		},
	],
};

describe('safeParseTree', () => {
	describe('Scenario: a valid document gives a tree', () => {
		const result = safeParseTree(widgets, document);

		it('holds a node for every child path, in document order', () => {
			expect(result.success).toBe(true);
			const tree = result.success ? result.tree : undefined;
			const blocks = tree?.children.blocks;

			expect(tree?.$type).toBe('layout');
			expect(Array.isArray(blocks) && blocks.map((node) => node.data)).toEqual([
				{ $type: 'block', title: 'One', engine: { controls: [{ $type: 'knob', value: 1 }] } },
				{
					$type: 'block',
					title: 'Untitled',
					engine: {
						controls: [
							{ $type: 'knob', value: 2 },
							{ $type: 'knob', value: 3 },
						],
					},
				},
			]);
		});

		it('reaches a child through a path of several keys, with the path it has in the document', () => {
			const tree = result.success ? result.tree : undefined;
			const first = tree?.children.blocks;
			const controls = Array.isArray(first) ? first[1]?.children['engine.controls'] : undefined;

			expect(Array.isArray(controls) && controls.map((node) => node.path)).toEqual([
				['blocks', 1, 'engine', 'controls', 0],
				['blocks', 1, 'engine', 'controls', 1],
			]);
		});
	});

	describe('Scenario: a child path that holds one node', () => {
		it('gives that node, not a list, at the path it has in the document', () => {
			const frame = createRegistry('Widget', [
				{
					$type: 'frame',
					schema: z.looseObject({ $type: z.literal('frame') }),
					metadata: { name: 'Frame' },
					childPaths: [['content']],
				},
				knob,
			]);
			const result = safeParseTree(frame, { $type: 'frame', content: { $type: 'knob', value: 4 } });
			const content = result.success ? result.tree.children.content : undefined;

			expect(Array.isArray(content)).toBe(false);
			expect(content).toMatchObject({ $type: 'knob', data: { value: 4 }, path: ['content'] });
		});
	});

	describe('Scenario: every issue of a three-level document is reported at its full path', () => {
		const broken: unknown = JSON.parse(
			JSON.stringify({
				$type: 'layout',
				blocks: [
					{ $type: 'block', title: 5 },
					{ $type: 'block', engine: { controls: [{ $type: 'knob', value: 1 }, { $type: 'dial' }] } },
				],
			}),
		);
		const result = safeParseTree(widgets, broken);

		it('collects the issues of every branch', () => {
			expect(!result.success && result.issues.map((issue) => issue.path)).toEqual([
				['blocks', 0, 'title'],
				['blocks', 1, 'engine', 'controls', 1, '$type'],
			]);
		});

		it('writes the position of an issue with formatIssuePath', () => {
			const issue = !result.success ? result.issues[1] : undefined;

			expect(formatIssuePath(issue?.path, broken)).toBe('blocks[1].engine.controls[1].$type');
			expect(issue?.message).toBe("No registration for $type 'dial'.");
		});
	});

	describe('Scenario: a value at a child path that is no node', () => {
		it('is an issue at that path, when the schema of the node lets it through', () => {
			const loose = createRegistry('Widget', [
				{ ...layout, schema: z.looseObject({ $type: z.literal('layout') }) },
			]);
			const result = safeParseTree(loose, { $type: 'layout', blocks: 'none' });

			expect(!result.success && result.issues).toEqual([
				{ message: 'Expected a node or a list of nodes.', path: ['blocks'] },
			]);
		});

		it('is left to the schema of the node when it says what blocks may hold', () => {
			const result = safeParseTree(widgets, { $type: 'layout', blocks: 'none' });

			expect(!result.success && result.issues.map((issue) => issue.path)).toEqual([['blocks']]);
		});

		it('is no issue when the value is missing and the schema allows it', () => {
			expect(safeParseTree(widgets, { $type: 'layout' }).success).toBe(true);
		});
	});

	describe('Scenario: a node that contains itself', () => {
		it('is an issue at the position it is reached again, not a stack overflow', () => {
			const loop: Record<string, unknown> = { $type: 'layout', blocks: [] };
			(loop.blocks as unknown[]).push(loop);
			const result = safeParseTree(widgets, loop);

			expect(!result.success && result.issues).toContainEqual({
				message: 'A node cannot contain itself.',
				path: ['blocks', 0],
			});
		});
	});

	describe('Scenario: the path of the root', () => {
		it('starts every issue', () => {
			const result = safeParseTree(widgets, { $type: 'layout', blocks: 3 }, ['page']);

			expect(!result.success && result.issues.map((issue) => issue.path)).toContainEqual(['page', 'blocks']);
		});
	});

	describe('Scenario: single-node use is unchanged', () => {
		it('checks a node with safeParseNode as it did, ignoring childPaths', () => {
			const result = safeParseNode(widgets, { $type: 'layout', blocks: [{ $type: 'nothing' }] });

			expect(result.success).toBe(true);
		});
	});
});

describe('createRegistry childPaths', () => {
	const withPaths = (childPaths: unknown) => ({ ...layout, childPaths }) as unknown as BaseRegistration;

	it('throws naming the kind and the $type for a path that is not a non-empty list of keys', () => {
		expect(() => createRegistry('Widget', [withPaths([[]])])).toThrow(
			"Widget 'layout' childPaths must hold non-empty lists of non-empty keys.",
		);
		expect(() => createRegistry('Widget', [withPaths([['blocks', '']])])).toThrow(/Widget 'layout' childPaths/);
		expect(() => createRegistry('Widget', [withPaths(['blocks'])])).toThrow(/Widget 'layout' childPaths/);
		expect(() => createRegistry('Widget', [withPaths('blocks')])).toThrow(
			"Widget 'layout' childPaths must be a list of key paths.",
		);
	});

	it('throws for a path declared twice', () => {
		expect(() => createRegistry('Widget', [withPaths([['blocks'], ['blocks']])])).toThrow(
			"Widget 'layout' declares the child path 'blocks' twice.",
		);
	});

	it('throws for a path that runs through another, in either order', () => {
		expect(() => createRegistry('Widget', [withPaths([['engine'], ['engine', 'controls']])])).toThrow(
			"Widget 'layout' child path 'engine.controls' runs through the child path 'engine'.",
		);
		expect(() => createRegistry('Widget', [withPaths([['engine', 'controls'], ['engine']])])).toThrow(
			"Widget 'layout' child path 'engine.controls' runs through the child path 'engine'.",
		);
	});

	it('accepts paths that share a first key without one running through the other', () => {
		expect(() =>
			createRegistry('Widget', [
				withPaths([
					['engine', 'controls'],
					['engine', 'meters'],
				]),
			]),
		).not.toThrow();
	});

	it('accepts a registration with no child path', () => {
		expect(createRegistry('Widget', [knob]).get('knob')).not.toHaveProperty('childPaths');
	});
});
