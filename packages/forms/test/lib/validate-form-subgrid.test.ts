import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { gridTrackItems } from '@/lib/grid-track-items';
import { elementChildrenSchema } from '@/lib/element-children';
import { defineInput } from '@/types';
import { ElementGridConfigSchema } from '@schema-engine/layout';
import { anyValue } from '../lib/any-value';

const formWith = (elements: unknown[], grid?: unknown) => ({
	id: 'subgrid',
	...(grid ? { grid } : {}),
	steps: [{ id: 'main', title: 'Main', elements }],
});
const field = (name: string, grid?: unknown) => ({ $type: 'field', id: name, name, ...(grid ? { grid } : {}) });
const group = (name: string, elements: unknown[], grid?: unknown) => ({
	$type: 'group',
	id: name,
	name,
	elements,
	...(grid ? { grid } : {}),
});
const list = (name: string, elements: unknown[], grid?: unknown) => ({
	$type: 'list',
	id: name,
	name,
	elements,
	...(grid ? { grid } : {}),
});
const subgrid = (name: string, elements: unknown[], extra: Record<string, unknown> = {}) =>
	group(name, elements, { subgrid: true, ...extra });

describe('subgrid validation', () => {
	const gridField = defineInput({
		value: anyValue,
		$type: 'field',
		schema: z.looseObject({
			$type: z.literal('field'),
			id: z.string(),
			name: z.string(),
			grid: z.optional(ElementGridConfigSchema),
		}),
		metadata: { name: 'Field', category: 'input' },
		render: () => null,
	});
	const container = (type: 'group' | 'list', kind: 'object' | 'array') =>
		defineInput({
			childPaths: [{ keys: ['elements'] }],
			$type: type,
			containerKind: kind,
			schema: z.looseObject({
				$type: z.literal(type),
				id: z.string(),
				name: z.string(),
				grid: z.optional(ElementGridConfigSchema),
				elements: elementChildrenSchema,
			}),
			metadata: { name: type, category: 'input' },
			render: () => null,
		});
	const engine = createFormEngine({
		elements: [gridField, container('group', 'object'), container('list', 'array')],
	});

	const failure = (form: unknown) => {
		const result = engine.safeValidateForm(form);
		if (result.success) throw new Error('Expected the form to be rejected.');
		return result.issues;
	};
	const only = (form: unknown) => {
		const issues = failure(form);
		expect(issues).toHaveLength(1);
		return issues[0]!;
	};

	test('a fieldset of fields on the parent tracks is accepted', () => {
		const form = formWith([
			field('first', { width: 'half' }),
			subgrid('address', [field('street', { width: 'half' }), field('city', { width: 'half' })]),
		]);
		expect(() => engine.validateForm(form)).not.toThrow();
	});

	test('a subgrid may hide itself and set its spacing', () => {
		const form = formWith([
			subgrid('address', [field('street')], {
				marginBlockStart: 'loose',
				responsive: { md: { hidden: true } },
			}),
		]);
		expect(() => engine.validateForm(form)).not.toThrow();
	});

	test('subgrids nest, and each level may place its children by width', () => {
		const form = formWith([
			field('first', { width: 'half' }),
			subgrid('outer', [subgrid('inner', [field('a', { width: 'half' }), field('b', { width: 'half' })])]),
		]);
		expect(() => engine.validateForm(form)).not.toThrow();
	});

	test('a subgrid inside a container that is not one takes that container tracks', () => {
		const form = formWith([group('plain', [subgrid('inner', [field('a', { width: 'half' })])])], { columns: 3 });
		expect(() => engine.validateForm(form)).not.toThrow();
	});

	test('a field cannot be a subgrid, and the issue is at its subgrid key', () => {
		const issue = only(formWith([field('lonely', { subgrid: true })]));
		expect(issue.path).toEqual(['steps', 0, 'elements', 0, 'grid', 'subgrid']);
		expect(issue.message).toMatch(/'lonely'.*'subgrid'.*no elements/);
	});

	test('an array cannot be a subgrid, because its rows are not supported yet', () => {
		const issue = only(formWith([list('rows', [field('a')], { subgrid: true })]));
		expect(issue.path).toEqual(['steps', 0, 'elements', 0, 'grid', 'subgrid']);
		expect(issue.message).toMatch(/'rows'.*'subgrid'.*array.*rows.*not supported yet/s);
	});

	test.each([
		['width', { width: 'half' }, ['grid', 'width']],
		['offset', { offset: 'quarter' }, ['grid', 'offset']],
		['column', { column: 2 }, ['grid', 'column']],
		['span', { span: 2 }, ['grid', 'span']],
		['justifySelf', { justifySelf: 'start' }, ['grid', 'justifySelf']],
		['placeSelf', { placeSelf: 'center' }, ['grid', 'placeSelf']],
		['a responsive width', { responsive: { md: { width: 'half' } } }, ['grid', 'responsive', 'md', 'width']],
	])('a subgrid that sets %s is rejected at that key', (_label, extra, path) => {
		const issue = only(formWith([subgrid('address', [field('street')], extra)]));
		expect(issue.path).toEqual(['steps', 0, 'elements', 0, ...path]);
		expect(issue.message).toMatch(/'address'.*'subgrid' and/);
	});

	test('a subgrid that sets area is rejected at that key, and the step reports the area it claims', () => {
		const issues = failure(formWith([subgrid('address', [field('street')], { area: 'a' })]));
		expect(issues.map(({ path, message }) => ({ path, message }))).toEqual([
			{
				path: ['steps', 0, 'elements', 0, 'grid', 'area'],
				message: `Field 'address' sets grid 'subgrid' and 'area'; a subgrid spans its parent's full row, so it takes no 'width', 'offset', 'column', 'area', 'span', 'justifySelf' or 'placeSelf'.`,
			},
			{
				path: ['steps', 0, 'elements', 0, 'grid', 'area'],
				message: `Field 'address' sets grid 'area' but the form grid has no 'areas'.`,
			},
		]);
	});

	test('a subgrid inside responsive is rejected by the grid schema', () => {
		const issue = only(formWith([group('address', [field('street')], { responsive: { md: { subgrid: true } } })]));
		expect(issue.path.slice(0, 3)).toEqual(['steps', 0, 'elements']);
		expect(issue.path).toContain('subgrid');
	});

	test('a subgrid under a grid that draws areas is rejected at its subgrid key', () => {
		const form = formWith([field('a', { area: 'a' }), subgrid('address', [field('street')])], { areas: ['a'] });
		const issue = only(form);
		expect(issue.path).toEqual(['steps', 0, 'elements', 1, 'grid', 'subgrid']);
		expect(issue.message).toMatch(/'address'.*'subgrid'.*'areas'/);
	});

	test('a step grid with its own areas rejects a subgrid even when the form has none', () => {
		const form = {
			id: 'subgrid',
			steps: [
				{
					id: 'main',
					title: 'Main',
					grid: { areas: ['a'] },
					elements: [field('a', { area: 'a' }), subgrid('address', [field('street')])],
				},
			],
		};
		expect(only(form).path).toEqual(['steps', 0, 'elements', 1, 'grid', 'subgrid']);
	});

	test('widths inside a subgrid under a columns parent are rejected at the inner width', () => {
		const form = formWith([subgrid('address', [field('street', { width: 'half' })])], { columns: 3 });
		const issue = only(form);
		expect(issue.path).toEqual(['steps', 0, 'elements', 0, 'elements', 0, 'grid', 'width']);
		expect(issue.message).toMatch(/'columns'.*'street'.*'width' or 'offset'.*a grid uses areas, widths or columns/);
	});

	test('widths reached through nested subgrids are rejected the same way', () => {
		const form = formWith(
			[subgrid('outer', [subgrid('inner', [field('deep', { responsive: { md: { offset: 'half' } } })])])],
			{ columns: 2 },
		);
		expect(only(form).path).toEqual([
			'steps',
			0,
			'elements',
			0,
			'elements',
			0,
			'elements',
			0,
			'grid',
			'responsive',
			'md',
			'offset',
		]);
	});

	test('widths reached through nested subgrids are rejected under a step grid with columns', () => {
		const form = {
			id: 'subgrid',
			steps: [
				{
					id: 'main',
					title: 'Main',
					grid: { minColumnWidth: '10rem' },
					elements: [subgrid('outer', [field('deep', { width: 'half' })])],
				},
			],
		};
		expect(only(form).message).toMatch(/'minColumnWidth'.*'deep'/);
	});

	test('a container that is not a subgrid stops the walk, since it has its own tracks', () => {
		const form = formWith([group('plain', [field('inner', { width: 'half' })])], { columns: 3 });
		expect(() => engine.validateForm(form)).not.toThrow();
	});

	test('a width directly under a columns grid still points at the grid, as before', () => {
		const issue = only(formWith([field('w', { width: 'half' })], { columns: 3 }));
		expect(issue.path).toEqual(['grid', 'columns']);
	});

	test('an area on a child of a subgrid is still rejected as inside a container', () => {
		const form = formWith([subgrid('address', [field('inner', { area: 'a' })])]);
		expect(only(form).message).toMatch(/'inner'.*'area'.*container/);
	});
});

describe('gridTrackItems', () => {
	const leaf = (name: string, grid?: unknown) => ({ name, ...(grid ? { grid } : {}) });
	const names = (items: readonly unknown[]) => items.map((item) => (item as { name: string }).name);

	test('is the elements themselves when none is a subgrid', () => {
		const elements = [leaf('a'), { name: 'g', elements: [leaf('inner')] }];
		expect(gridTrackItems(elements)).toEqual(elements);
	});

	test('adds the children of a subgrid, depth first, and stops at a container that is not one', () => {
		const elements = [
			leaf('a'),
			{
				name: 'outer',
				grid: { subgrid: true },
				elements: [
					leaf('b'),
					{ name: 'inner', grid: { subgrid: true }, elements: [leaf('c')] },
					{ name: 'plain', elements: [leaf('hidden')] },
				],
			},
			leaf('d'),
		];
		expect(names(gridTrackItems(elements))).toEqual(['a', 'outer', 'b', 'inner', 'c', 'plain', 'd']);
	});

	test('treats a subgrid without elements as a leaf', () => {
		expect(names(gridTrackItems([{ name: 'odd', grid: { subgrid: true } }]))).toEqual(['odd']);
	});
});
