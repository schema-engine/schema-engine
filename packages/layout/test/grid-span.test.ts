import { describe, expect, test } from 'vitest';
import {
	ElementGridConfigSchema,
	GridLayoutConfigSchema,
	createLayoutTheme,
	getGridItemVariables,
	getGridVariables,
	gridSpanIssues,
	spanPlacementIssue,
	subgridPlacementIssue,
	type GridThemeOptions,
} from '@/index';
import { computeElement, type ElementOptions } from './resolve-stylesheet';

const layout = (grid?: GridThemeOptions) => createLayoutTheme({ grid });
const CLAMP = 'span min(7,var(--se-grid-track-count,1))';

describe('the span key', () => {
	test('compiles to a span clamped to the track count the grid publishes', () => {
		expect(getGridItemVariables({ span: 7 })).toEqual({ '--se-item-grid-column': CLAMP });
	});

	test('changes by breakpoint, each slot clamped on its own', () => {
		expect(getGridItemVariables({ span: 2, responsive: { md: { span: 7 }, lg: { span: 3 } } })).toEqual({
			'--se-item-grid-column': 'span min(2,var(--se-grid-track-count,1))',
			'--se-item-grid-column-md': CLAMP,
			'--se-item-grid-column-lg': 'span min(3,var(--se-grid-track-count,1))',
		});
	});

	test('responsive.default overrides the top-level span', () => {
		expect(getGridItemVariables({ span: 2, responsive: { default: { span: 7 } } })).toEqual({
			'--se-item-grid-column': CLAMP,
		});
	});

	test('a later slot with a width replaces an earlier span at that width', () => {
		const variables = getGridItemVariables({ span: 7, responsive: { md: { width: 'half' } } });
		expect(variables['--se-item-grid-column']).toBe(CLAMP);
		expect(variables['--se-item-grid-column-md']).toBe('span 6');
	});

	test.each([0, -1, 1.5, '3'])('the schema rejects span %j', (span) => {
		expect(ElementGridConfigSchema.safeParse({ span }).success).toBe(false);
	});

	test('the schema accepts a positive integer, also per breakpoint', () => {
		expect(ElementGridConfigSchema.safeParse({ span: 3, responsive: { md: { span: 7 } } }).success).toBe(true);
	});
});

describe('the track count a grid publishes', () => {
	const theme = layout().grid;

	test('columns: n gives n, per slot, beside the template', () => {
		expect(getGridVariables({ columns: 4, responsive: { md: { columns: 12 } } }, theme, [])).toEqual({
			'--se-grid-template': 'repeat(4, minmax(0, 1fr))',
			'--se-grid-tracks': '4',
			'--se-grid-template-md': 'repeat(12, minmax(0, 1fr))',
			'--se-grid-tracks-md': '12',
		});
	});

	test('columns: auto gives one, because CSS cannot count auto-fit tracks', () => {
		expect(getGridVariables({ columns: 'auto' }, theme, [])['--se-grid-tracks']).toBe('1');
	});

	test('a sparse slot keeps the count of the slot before it by the stylesheet cascade', () => {
		const variables = getGridVariables({ columns: 4, responsive: { md: { gap: 'loose' } } }, theme, []);
		expect(variables['--se-grid-tracks']).toBe('4');
		expect(variables['--se-grid-tracks-md']).toBeUndefined();
	});

	test('named widths give twelve', () => {
		const variables = getGridVariables(undefined, theme, [{ grid: { width: 'half' } }]);
		expect(variables).toEqual({
			'--se-grid-template': 'repeat(12, minmax(0, 1fr))',
			'--se-grid-tracks': '12',
			'--se-grid-default-column': '1 / -1',
		});
	});

	test('areas give the width of their rows, per slot', () => {
		const variables = getGridVariables({ areas: { default: ['a'], md: ['a b c', 'a b c'] } }, theme, []);
		expect(variables['--se-grid-tracks']).toBe('1');
		expect(variables['--se-grid-tracks-md']).toBe('3');
	});

	test('a grid with no columns publishes nothing, and the stylesheet counts one track', () => {
		expect(getGridVariables(undefined, theme, [])).toEqual({});
	});
});

describe('the clamp in the stylesheet', () => {
	const gridConfig = { columns: 4, responsive: { md: { columns: 12 } } } as const;

	/** What `grid-column` an item computes under a grid of `gridConfig` at a width, in either query mode. */
	function itemColumn(query: 'media' | 'container', width: number, itemSpan: number): string | undefined {
		const sheet = layout({ query });
		const grid = computeElement(sheet.css, sheet.id, 'grid', width, {
			inline: getGridVariables(gridConfig, sheet.grid, []),
		});
		return computeElement(sheet.css, sheet.id, 'item', width, {
			inherited: grid.custom,
			inline: getGridItemVariables({ span: itemSpan }),
		}).value('grid-column');
	}

	test.each(['media', 'container'] as const)('%s mode: a span of 7 is 4 tracks below md and 7 from md', (query) => {
		expect(itemColumn(query, 400, 7)).toBe('span min(7,4)');
		expect(itemColumn(query, 800, 7)).toBe('span min(7,12)');
	});

	test('the count is the grid own: an item under a grid with no template clamps to one track', () => {
		const sheet = layout();
		const grid = computeElement(sheet.css, sheet.id, 'grid', 800);
		const item = computeElement(sheet.css, sheet.id, 'item', 800, {
			inherited: grid.custom,
			inline: getGridItemVariables({ span: 3 }),
		});
		expect(item.value('grid-column')).toBe('span min(3,1)');
	});

	/**
	 * A media theme measures parent and nested grid on one viewport, so the nested grid sits at the parent's width;
	 * a container theme can put it in a narrower container, below the breakpoint the parent's gates matched.
	 */
	test.each([
		['media', 800],
		['container', 400],
	] as const)(
		'%s mode: a nested grid at %ipx counts its own tracks, not the count it inherits from its parent',
		(query, nestedWidth) => {
			const sheet = layout({ query });
			const parent = computeElement(sheet.css, sheet.id, 'grid', 800, {
				inline: getGridVariables(gridConfig, sheet.grid, []),
			});
			expect(parent.custom['--se-grid-track-count']).toBe('12');
			const nested = (inline: ElementOptions['inline'] = {}) =>
				computeElement(sheet.css, sheet.id, 'grid', nestedWidth, { inherited: parent.custom, inline }).custom[
					'--se-grid-track-count'
				];
			expect(nested()).toBe('1');
			expect(nested(getGridVariables({ columns: 3 }, sheet.grid, []))).toBe('3');
			expect(nested(getGridVariables({ columns: 'auto' }, sheet.grid, []))).toBe('1');
		},
	);

	test('a subgrid takes the resolved count of the grid it sits in, not a slot variable the reset cleared', () => {
		const sheet = layout({ query: 'container' });
		const rule = sheet.css
			.split('\n')
			.find((line) => line.startsWith(`.se-grid.se-subgrid[data-se-theme="${sheet.id}"]{`));
		expect(rule).toContain('--se-grid-track-count:inherit;');
		expect(rule).not.toContain('--se-grid-tracks');
	});

	test('the grid rule declares the count through the slot gates, and an unset grid falls back to one', () => {
		const sheet = layout();
		const rule = sheet.css.split('\n').find((line) => line.startsWith(`.se-grid[data-se-theme="${sheet.id}"]{`));
		expect(rule).toMatch(
			/--se-grid-track-count:(?:var\(--l\w+-g4(?:2xl|xl|lg|md|sm),){5}var\(--se-grid-tracks,1\)\)\)\)\)\);/,
		);
	});
});

describe('autoFlow', () => {
	const theme = layout().grid;

	test('emits the literal grid-auto-flow value', () => {
		expect(getGridVariables({ autoFlow: 'dense' }, theme, [])).toEqual({ '--se-grid-auto-flow': 'dense' });
		expect(getGridVariables({ autoFlow: 'row' }, theme, [])).toEqual({ '--se-grid-auto-flow': 'row' });
	});

	test('the stylesheet reads it with a row fallback and resets it on a nested grid', () => {
		const sheet = layout();
		const rule = sheet.css.split('\n').find((line) => line.startsWith(`.se-grid[data-se-theme="${sheet.id}"]{`));
		expect(rule).toContain('--se-grid-auto-flow:initial;');
		expect(rule).toContain('grid-auto-flow:var(--se-grid-auto-flow,row);');
	});

	test('the schema accepts row and dense at the top level and nothing else', () => {
		expect(GridLayoutConfigSchema.safeParse({ autoFlow: 'dense' }).success).toBe(true);
		expect(GridLayoutConfigSchema.safeParse({ autoFlow: 'column' }).success).toBe(false);
	});

	test('is structure, so it is rejected inside responsive', () => {
		expect(GridLayoutConfigSchema.safeParse({ responsive: { md: { autoFlow: 'dense' } } }).success).toBe(false);
	});
});

describe('a width: auto is not a width', () => {
	test('the schema rejects it', () => {
		expect(ElementGridConfigSchema.safeParse({ width: 'auto' }).success).toBe(false);
	});
});

describe('spanPlacementIssue', () => {
	test.each(['width', 'offset', 'column', 'area'] as const)('rejects span beside %s in one slot', (key) => {
		const value = { width: 'half', offset: 'quarter', column: 2, area: 'header' }[key];
		const issue = spanPlacementIssue({ grid: { span: 3, [key]: value } });
		expect(issue?.path).toEqual(['grid', key]);
		expect(issue?.message).toContain(`'span' and '${key}'`);
	});

	test('names the slot an authored conflict sits in', () => {
		const issue = spanPlacementIssue({ grid: { responsive: { md: { span: 3, width: 'half' } } } });
		expect(issue?.path).toEqual(['grid', 'responsive', 'md', 'width']);
		expect(issue?.message).toContain("at 'md'");
	});

	test('names responsive.default, not the top level, when the conflict is written there', () => {
		const element = { grid: { responsive: { default: { span: 3, column: 2 } } } };
		expect(spanPlacementIssue(element)?.path).toEqual(['grid', 'responsive', 'default', 'column']);
		expect(subgridPlacementIssue({ grid: { subgrid: true, responsive: { default: { span: 3 } } } })?.path).toEqual([
			'grid',
			'responsive',
			'default',
			'span',
		]);
	});

	test('allows a span in one slot and a width in another', () => {
		expect(spanPlacementIssue({ grid: { span: 3, responsive: { md: { width: 'half' } } } })).toBeUndefined();
		expect(spanPlacementIssue({ grid: { width: 'half', responsive: { md: { span: 3 } } } })).toBeUndefined();
	});

	test('allows a span beside a row and an alignment', () => {
		expect(spanPlacementIssue({ grid: { span: 3, row: 2, alignSelf: 'start' } })).toBeUndefined();
	});

	test('a subgrid takes no span, since it spans its parent full row', () => {
		expect(subgridPlacementIssue({ grid: { subgrid: true, span: 3 } })?.path).toEqual(['grid', 'span']);
	});
});

describe('gridSpanIssues', () => {
	const item = (span: number) => ({ grid: { span } });

	test('has nothing to report under a numeric template', () => {
		expect(gridSpanIssues({ columns: 4 }, [item(7)])).toEqual([]);
		expect(gridSpanIssues(undefined, [item(7)])).toEqual([]);
	});

	test('reports a span under columns: auto, at the span the author wrote', () => {
		const issues = gridSpanIssues({ columns: 'auto' }, [item(2), { grid: {} }, item(7)]);
		expect(issues.map((issue) => issue.path)).toEqual([
			[0, 'grid', 'span'],
			[2, 'grid', 'span'],
		]);
		expect(issues[0]?.message).toContain("columns are 'auto'");
	});

	test('reports a span that carries into a slot where columns turn auto, naming the span key and the grid slot', () => {
		const grid = { columns: 4, responsive: { lg: { columns: 'auto' } } };
		const issues = gridSpanIssues(grid, [{ grid: { responsive: { md: { span: 3 } } } }]);
		expect(issues).toHaveLength(1);
		expect(issues[0]?.path).toEqual([0, 'grid', 'responsive', 'md', 'span']);
		expect(issues[0]?.message).toContain("at 'lg'");
	});

	test('names responsive.default when the span is written there', () => {
		const issues = gridSpanIssues({ columns: 'auto' }, [{ grid: { responsive: { default: { span: 3 } } } }]);
		expect(issues.map((issue) => issue.path)).toEqual([[0, 'grid', 'responsive', 'default', 'span']]);
	});

	test('a raw column at the auto slot replaces the narrower span, so it has no issue', () => {
		const grid = { columns: 4, responsive: { lg: { columns: 'auto' } } };
		const element = { grid: { span: 3, responsive: { lg: { column: '1 / -1' } } } };
		expect(gridSpanIssues(grid, [element])).toEqual([]);
	});

	test('a span authored only after the auto slots has no issue there', () => {
		const grid = { columns: 'auto', responsive: { md: { columns: 6 } } };
		expect(gridSpanIssues(grid, [{ grid: { responsive: { md: { span: 3 } } } }])).toEqual([]);
	});

	test('reports one issue per element, at the first auto slot', () => {
		const grid = { columns: 'auto', responsive: { md: { columns: 6 }, xl: { columns: 'auto' } } };
		expect(gridSpanIssues(grid, [item(2)])).toHaveLength(1);
	});

	test('a grid that draws areas or whose items use named widths has a known count', () => {
		expect(gridSpanIssues({ columns: 'auto', areas: ['a b'] }, [item(2)])).toEqual([]);
		expect(gridSpanIssues({ columns: 'auto' }, [item(2), { grid: { width: 'half' } }])).toEqual([]);
	});
});
