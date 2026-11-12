import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { FormValidationError } from '@/lib/validate-form';
import { defineInput } from '@/types';
import { ElementGridConfigSchema } from '@schema-engine/layout';
import { elementChildrenSchema } from '@/lib/element-children';

const formWith = (elements: unknown[], grid?: unknown) => ({
	id: 'areas',
	...(grid ? { grid } : {}),
	steps: [{ id: 'main', title: 'Main', elements }],
});
const fieldNamed = (name: string, grid?: unknown) => ({ $type: 'field', id: name, name, ...(grid ? { grid } : {}) });

describe('named grid areas', () => {
	const gridField = defineInput({
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
	const group = defineInput({
		$type: 'group',
		containerKind: 'object',
		schema: z.looseObject({
			$type: z.literal('group'),
			id: z.string(),
			name: z.string(),
			elements: elementChildrenSchema,
		}),
		metadata: { name: 'Group', category: 'input' },
		render: () => null,
	});
	const engine = createFormEngine({ elements: [gridField, group] });
	const claiming = (...names: string[]) => names.map((name) => fieldNamed(name, { area: name }));
	const drawn = ['a a a b b b', 'a a a c c c', 'd d e e e e'];

	test('A drawn layout is accepted when every area is claimed', () => {
		expect(() => engine.validateForm(formWith(claiming('a', 'b', 'c', 'd', 'e'), { areas: drawn }))).not.toThrow();
	});

	test('accepts a responsive template whose fields claim areas by breakpoint', () => {
		const grid = { areas: { default: ['a', 'b'], md: ['a b'] } };
		expect(() => engine.validateForm(formWith(claiming('a', 'b'), grid))).not.toThrow();
	});

	test('accepts empty cells and a field that claims no area', () => {
		const grid = { areas: ['a .', 'a b'] };
		expect(() => engine.validateForm(formWith([...claiming('a', 'b'), fieldNamed('free')], grid))).not.toThrow();
	});

	test('accepts an area that changes by breakpoint with the template', () => {
		const grid = { areas: { default: ['a', 'b'], md: ['a c'] } };
		const elements = [
			fieldNamed('a', { area: 'a' }),
			fieldNamed('b', { area: 'b', responsive: { md: { area: 'c' } } }),
		];
		expect(() => engine.validateForm(formWith(elements, grid))).not.toThrow();
	});

	test('rejects rows of unequal length naming the row', () => {
		const attempt = () => engine.validateForm(formWith(claiming('a', 'b'), { areas: ['a a', 'b'] }));
		expect(attempt).toThrow(FormValidationError);
		expect(attempt).toThrow(/areas.*row 2 has 1 cell but row 1 has 2/);
	});

	test('A non-rectangular area fails validation', () => {
		const attempt = () => engine.validateForm(formWith(claiming('a', 'b'), { areas: ['b a', 'b b'] }));
		expect(attempt).toThrow(FormValidationError);
		expect(attempt).toThrow(/area 'b' is not rectangular/);
	});

	test('rejects an area split in two naming it', () => {
		const attempt = () => engine.validateForm(formWith(claiming('a', 'b'), { areas: ['a b a'] }));
		expect(attempt).toThrow(/area 'a' is not rectangular/);
	});

	test('names the breakpoint of the template that fails', () => {
		const attempt = () =>
			engine.validateForm(
				formWith(claiming('a', 'b'), { areas: { default: ['a', 'b'], lg: ['a a', 'a b', 'b b'] } }),
			);
		expect(attempt).toThrow(/'lg'.*not rectangular/);
	});

	test('An unknown area fails validation', () => {
		const attempt = () => engine.validateForm(formWith(claiming('a', 'c'), { areas: ['a b'] }));
		expect(attempt).toThrow(/'c'.*not in the grid areas \(a, b\)/);
	});

	test('rejects a field area missing from the template at one breakpoint', () => {
		const grid = { areas: { default: ['a', 'b'], md: ['a c'] } };
		const attempt = () => engine.validateForm(formWith(claiming('a', 'b'), grid));
		expect(attempt).toThrow(/'b'.*'md'.*not in the grid areas \(a, c\)/);
	});

	test('rejects an area on a field when the grid draws none', () => {
		const attempt = () => engine.validateForm(formWith(claiming('a')));
		expect(attempt).toThrow(/'a'.*'area'.*no 'areas'/);
	});

	test('An unclaimed area fails validation', () => {
		const attempt = () => engine.validateForm(formWith(claiming('a'), { areas: ['a b'] }));
		expect(attempt).toThrow(/area 'b'.*not claimed/);
	});

	test('rejects an area claimed only below the breakpoint that introduces it', () => {
		const grid = { areas: { default: ['a', 'b'], md: ['a b', 'a c'] } };
		const attempt = () => engine.validateForm(formWith(claiming('a', 'b'), grid));
		expect(attempt).toThrow(/area 'c'.*'md'.*not claimed/);
	});

	test('rejects a responsive record that does not start at the default width', () => {
		const attempt = () => engine.validateForm(formWith(claiming('a'), { areas: { md: ['a'] } }));
		expect(attempt).toThrow(/areas.*'default'/);
	});

	test.each([
		['columns', { columns: 2 }, 'columns'],
		['a responsive columns entry', { responsive: { md: { columns: 2 } } }, 'columns'],
		['a minimum column width', { minColumnWidth: '12rem' }, 'minColumnWidth'],
	])('areas and columns cannot be mixed (%s)', (_label, extra, key) => {
		const attempt = () => engine.validateForm(formWith(claiming('a', 'b'), { areas: ['a b'], ...extra }));
		expect(attempt).toThrow(FormValidationError);
		expect(attempt).toThrow(new RegExp(`'areas' and '${key}'.*a grid uses areas, widths or columns`));
	});

	test('rejects areas when a field uses width or offset', () => {
		const elements = [
			fieldNamed('a', { area: 'a' }),
			fieldNamed('b', { area: 'b' }),
			fieldNamed('w', { width: 'half' }),
		];
		const attempt = () => engine.validateForm(formWith(elements, { areas: ['a b'] }));
		expect(attempt).toThrow(/'areas'.*'w'.*'width' or 'offset'.*a grid uses areas, widths or columns/);
	});

	test.each([
		['width', { width: 'half' }, 'width'],
		['offset', { offset: 'quarter' }, 'offset'],
		['column', { column: 2 }, 'column'],
		['row', { row: 2 }, 'row'],
		['a responsive width', { responsive: { md: { width: 'half' } } }, 'width'],
	])('rejects a field area next to %s', (_label, extra, key) => {
		const grid = { areas: ['a'] };
		const attempt = () => engine.validateForm(formWith([fieldNamed('a', { area: 'a', ...extra })], grid));
		expect(attempt).toThrow(new RegExp(`'a'.*'area' and '${key}'`));
	});

	test('rejects an area on a child of a container', () => {
		const form = formWith(
			[...claiming('a'), { $type: 'group', id: 'g', name: 'g', elements: [fieldNamed('inner', { area: 'a' })] }],
			{ areas: ['a'] },
		);
		expect(() => engine.validateForm(form)).toThrow(/'inner'.*'area'.*container/);
	});

	test('rejects a name that could carry CSS', () => {
		expect(() => engine.validateForm(formWith([fieldNamed('a', { area: 'a;color:red' })]))).toThrow(
			/CSS identifiers/,
		);
		expect(() => engine.validateForm(formWith(claiming('a'), { areas: ['a; color:red'] }))).toThrow(
			/CSS identifiers/,
		);
	});

	test('a field hidden at a breakpoint need not be in that template', () => {
		const grid = { areas: { default: ['a', 'b'], md: ['a'] } };
		const elements = [
			fieldNamed('a', { area: 'a' }),
			fieldNamed('b', { area: 'b', responsive: { md: { hidden: true } } }),
		];
		expect(() => engine.validateForm(formWith(elements, grid))).not.toThrow();
	});

	test('the hidden state carries to wider breakpoints until a slot shows the field again', () => {
		const grid = { areas: { default: ['a', 'b'], md: ['a'], xl: ['a b'] } };
		const hiddenUntilXl = [
			fieldNamed('a', { area: 'a' }),
			fieldNamed('b', { area: 'b', responsive: { md: { hidden: true }, xl: { hidden: false } } }),
		];
		expect(() => engine.validateForm(formWith(hiddenUntilXl, grid))).not.toThrow();
		const hiddenForever = [
			fieldNamed('a', { area: 'a' }),
			fieldNamed('b', { area: 'b', responsive: { md: { hidden: true } } }),
		];
		expect(() => engine.validateForm(formWith(hiddenForever, grid))).not.toThrow();
		const shownAtMd = [fieldNamed('a', { area: 'a' }), fieldNamed('b', { area: 'b' })];
		expect(() => engine.validateForm(formWith(shownAtMd, grid))).toThrow(/'b'.*'md'.*not in the grid areas/);
	});

	test('a responsive default area beats the top-level one', () => {
		const grid = { areas: ['a b'] };
		const elements = [fieldNamed('a', { area: 'a', responsive: { default: { area: 'c' } } }), ...claiming('b')];
		expect(() => engine.validateForm(formWith(elements, grid))).toThrow(/'a'.*claims area 'c'.*\(a, b\)/);
	});

	describe('step grids', () => {
		const stepped = (formGrid: unknown, steps: Array<Record<string, unknown>>) => ({
			id: 'stepped',
			grid: formGrid,
			steps: steps.map((step, index) => ({ id: `s${index}`, title: `Step ${index}`, elements: [], ...step })),
		});

		test('Each wizard step draws its own template', () => {
			const form = stepped({ columns: 2 }, [
				{
					id: 'address',
					grid: { areas: ['street street', 'city zip'] },
					elements: claiming('street', 'city', 'zip'),
				},
				{ id: 'other', elements: [fieldNamed('x')] },
			]);
			const config = engine.validateForm(form);
			expect(config.steps[0]?.grid).toEqual({ areas: ['street street', 'city zip'] });
			expect(config.steps[1]?.grid).toBeUndefined();
			expect(config.grid).toEqual({ columns: 2 });
		});

		test('a step grid replaces the form grid, so form columns do not meet the step widths', () => {
			const form = stepped({ columns: 2 }, [
				{ grid: { gap: 'loose' }, elements: [fieldNamed('a', { width: 'half' })] },
			]);
			expect(() => engine.validateForm(form)).not.toThrow();
		});

		test('a step grid replaces the form grid, so form areas do not meet the step fields', () => {
			const form = stepped({ areas: ['a'] }, [{ grid: { columns: 2 }, elements: [fieldNamed('x')] }]);
			expect(() => engine.validateForm(form)).not.toThrow();
		});

		test('rejects the template of a step against that step fields, naming the step', () => {
			const form = stepped({ columns: 2 }, [
				{ id: 'address', grid: { areas: ['street zip'] }, elements: claiming('street') },
			]);
			expect(() => engine.validateForm(form)).toThrow(/steps\[0\].*'address'.*'zip'.*not claimed/);
		});

		test('rejects step columns next to step widths', () => {
			const form = stepped(undefined, [{ grid: { columns: 2 }, elements: [fieldNamed('a', { width: 'half' })] }]);
			expect(() => engine.validateForm(form)).toThrow(/Step grid sets 'columns'.*'a'/);
		});

		test('a form template applies to the fields of every step without its own grid', () => {
			const form = stepped({ areas: ['a b'] }, [{ elements: claiming('a') }]);
			expect(() => engine.validateForm(form)).toThrow(/steps\[0\].*area 'b'.*not claimed/);
		});

		test('rejects step areas next to step columns', () => {
			const form = stepped(undefined, [{ grid: { areas: ['a b'], columns: 2 }, elements: claiming('a', 'b') }]);
			expect(() => engine.validateForm(form)).toThrow(/Step grid sets 'areas' and 'columns'/);
		});

		test('checks a step field area against that step template by breakpoint', () => {
			const form = stepped({ columns: 2 }, [
				{
					grid: { areas: { default: ['a', 'b'], md: ['a c'] } },
					elements: claiming('a', 'b'),
				},
			]);
			expect(() => engine.validateForm(form)).toThrow(/'b'.*'md'.*not in the grid areas \(a, c\)/);
		});

		test('a form template left to a step without a grid hints at the step grid', () => {
			const form = stepped({ areas: ['a b'] }, [{ elements: claiming('a') }]);
			expect(() => engine.validateForm(form)).toThrow(/without a grid of its own/);
		});

		test('rejects a malformed step grid', () => {
			const form = stepped(undefined, [{ grid: { rows: 2 } }]);
			expect(() => engine.validateForm(form)).toThrow(FormValidationError);
		});
	});
});
