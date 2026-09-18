import { describe, expect, test } from 'vitest';
import {
	compileGridTheme,
	getDefaultCompiledGrid,
	getDefaultGridTheme,
	getFieldGridVariables,
	getFormGridVariables,
} from '@/lib/grid-styles';
import { GridGapTokens, type GridLayoutConfig } from '@/schemas/base-field';

const theme = (options?: Parameters<typeof compileGridTheme>[0]) => compileGridTheme(options).theme;
const css = (options?: Parameters<typeof compileGridTheme>[0]) => compileGridTheme(options).css;

describe('compileGridTheme', () => {
	test('keeps library defaults for unconfigured tokens', () => {
		expect(theme().breakpoints).toEqual({ sm: '40rem', md: '48rem', lg: '64rem', xl: '80rem', '2xl': '96rem' });
		expect(theme().gap.default).toBe('var(--space-stack, 1rem)');
	});

	test('overrides only the named breakpoint and token', () => {
		const resolved = theme({ breakpoints: { md: '50rem' }, gap: { loose: '3rem' } });
		expect(resolved.breakpoints.md).toBe('50rem');
		expect(resolved.breakpoints.lg).toBe('64rem');
		expect(resolved.gap.loose).toBe('3rem');
		expect(resolved.gap.compact).toBe('0.5rem');
	});

	test('rejects thresholds without a supported length unit', () => {
		expect(() => theme({ breakpoints: { sm: '640' } })).toThrow(/must be a px, rem, or em length/);
	});

	test('rejects thresholds that invert the named cascade order', () => {
		expect(() => theme({ breakpoints: { sm: '80rem' } })).toThrow(
			/must preserve cascade order sm ≤ md ≤ lg ≤ xl ≤ 2xl/,
		);
	});

	test('compares mixed rem and px thresholds at a 16px root', () => {
		const resolved = theme({ breakpoints: { sm: '640px' } });
		expect(resolved.breakpoints.sm).toBe('640px');
		expect(resolved.breakpoints.md).toBe('48rem');
		expect(() => theme({ breakpoints: { sm: '50rem', md: '700px' } })).toThrow(/must preserve cascade order/);
	});

	test('produces a stable identity from normalized options', () => {
		expect(theme({ breakpoints: { lg: '70rem' } }).id).toBe(theme({ breakpoints: { lg: '70rem' } }).id);
		expect(theme().id).not.toBe(theme({ minColumnWidth: '10rem' }).id);
	});

	test('returns a frozen theme graph', () => {
		const resolved = theme();
		expect(() => {
			(resolved.gap as { default: string }).default = '2rem';
		}).toThrow();
		expect(resolved.gap.default).toBe('var(--space-stack, 1rem)');
	});

	test('shares the library-default compiled pair', () => {
		expect(getDefaultCompiledGrid()).toBe(getDefaultCompiledGrid());
		expect(getDefaultGridTheme()).toBe(getDefaultCompiledGrid().theme);
	});
});

describe('generated stylesheet', () => {
	test('scopes rules to the theme identity', () => {
		expect(css()).toContain(`.se-form-grid[data-se-grid-theme="${theme().id}"]{`);
		expect(css()).not.toMatch(/(^|\n)\.se-form-grid\{/);
	});

	test('scopes field rules to the field host theme attribute', () => {
		expect(css()).toContain(`.se-form-field[data-se-grid-theme="${theme().id}"]{`);
		expect(css()).not.toContain(`.se-form-grid[data-se-grid-theme="${theme().id}"] .se-form-field{`);
	});

	test('generates media queries per configured breakpoint', () => {
		const stylesheet = css({ breakpoints: { sm: '30rem' } });
		expect(stylesheet).toContain('@media (min-width:30rem)');
		expect(stylesheet).toContain('@media (min-width:48rem)');
		expect(stylesheet).toContain('@media (min-width:64rem)');
	});

	test('declares engine gap defaults without shadowing the public tokens', () => {
		for (const token of GridGapTokens) {
			expect(css()).toContain(`--se-grid-gap-base-${token}:`);
			expect(css()).not.toMatch(new RegExp(`--se-grid-gap-${token}:`));
		}
	});

	test('declares no place-* shorthand that would reset the axis longhands', () => {
		expect(css()).not.toMatch(/place-(items|content|self):/);
	});

	test('defaults field alignment to auto so the grid alignment still applies', () => {
		expect(css()).toContain('justify-self:var(--se-field-justify-self, auto)');
		expect(css()).toContain('align-self:var(--se-field-align-self, auto)');
	});

	test('re-declares every responsive property inside each media query', () => {
		const query = css().split('@media (min-width:40rem)')[1] ?? '';
		for (const property of ['grid-template-columns', 'row-gap', 'column-gap']) {
			expect(query).toContain(`${property}:var(--se-grid-`);
		}
		for (const property of ['display', 'grid-column', 'grid-row', 'justify-self', 'align-self']) {
			expect(query).toContain(`${property}:var(--se-field-`);
		}
	});

	test('media queries fall back through narrower slots so sparse values cascade', () => {
		expect(css()).toContain(
			'grid-column:var(--se-field-grid-column-md, var(--se-field-grid-column-sm, var(--se-field-grid-column, auto)))',
		);
	});

	test('resets every slot so nested grids and fields do not inherit placement', () => {
		expect(css()).toContain('--se-grid-template:initial;');
		expect(css()).toContain('--se-grid-template-2xl:initial;');
		expect(css()).toContain('--se-field-grid-column:initial;');
		expect(css()).toContain('--se-field-align-self-xl:initial;');
		expect(css()).toContain('--se-grid-align-content:initial;');
	});
});

describe('getFormGridVariables', () => {
	test('maps a gap token to its theme variable on both axes', () => {
		const variables = getFormGridVariables({ gap: 'loose' }, theme());
		expect(variables['--se-grid-gap-y']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
		expect(variables['--se-grid-gap-x']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
		// No columns authored: the stylesheet's single-column fallback stands.
		expect(variables['--se-grid-template']).toBeUndefined();
	});

	test('passes raw CSS gap values through untouched', () => {
		const variables = getFormGridVariables({ gap: '1.5rem' }, theme());
		expect(variables['--se-grid-gap-y']).toBe('1.5rem');
	});

	test('emits nothing when no layout is authored', () => {
		expect(getFormGridVariables(undefined, theme())).toEqual({});
		expect(getFormGridVariables({}, theme())).toEqual({});
	});

	test('sparse responsive entries inherit the preceding breakpoint', () => {
		const grid: GridLayoutConfig = {
			columns: 1,
			responsive: {
				sm: { columns: 2 },
				md: { gap: 'loose' },
			},
		};
		const variables = getFormGridVariables(grid, theme());
		expect(variables['--se-grid-template-sm']).toBe('repeat(2, minmax(0, 1fr))');
		expect(variables['--se-grid-gap-y-md']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
		expect(variables['--se-grid-template']).toBe('repeat(1, minmax(0, 1fr))');
		// md re-states no columns, so the stylesheet resolves it from the sm slot.
		expect(variables['--se-grid-template-md']).toBeUndefined();
	});

	test('axis gaps beat the entry gap within the same breakpoint', () => {
		const variables = getFormGridVariables({ responsive: { sm: { gap: 'loose', gapX: 'compact' } } }, theme());
		expect(variables['--se-grid-gap-x-sm']).toBe('var(--se-grid-gap-compact, var(--se-grid-gap-base-compact))');
		expect(variables['--se-grid-gap-y-sm']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
	});

	test('responsive.default overrides the top-level baseline', () => {
		const grid: GridLayoutConfig = {
			gap: 'compact',
			responsive: { default: { gap: 'wide', gapY: 'loose' } },
		};
		const variables = getFormGridVariables(grid, theme());
		expect(variables['--se-grid-gap-y']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
		expect(variables['--se-grid-gap-x']).toBe('var(--se-grid-gap-wide, var(--se-grid-gap-base-wide))');
	});

	test('auto columns inline the minimum width into the authored slot', () => {
		const variables = getFormGridVariables({ columns: 'auto', minColumnWidth: '220px' }, theme());
		expect(variables['--se-grid-template']).toBe('repeat(auto-fit, minmax(min(220px, 100%), 1fr))');
	});

	test('a breakpoint that only changes the minimum width re-emits its template', () => {
		const variables = getFormGridVariables(
			{ columns: 'auto', responsive: { md: { minColumnWidth: '10rem' } } },
			theme(),
		);
		expect(variables['--se-grid-template-md']).toBe('repeat(auto-fit, minmax(min(10rem, 100%), 1fr))');
	});

	test('emits only the authored alignment axes', () => {
		const variables = getFormGridVariables({ justifyItems: 'center' }, theme());
		expect(variables['--se-grid-justify-items']).toBe('center');
		expect(variables['--se-grid-align-items']).toBeUndefined();
		expect(Object.keys(variables).every((key) => key.startsWith('--'))).toBe(true);
	});

	test('keeps multi-keyword alignment values in one axis', () => {
		const variables = getFormGridVariables({ placeContent: 'first baseline' }, theme());
		expect(variables['--se-grid-align-content']).toBe('first baseline');
		expect(variables['--se-grid-justify-content']).toBe('first baseline');
	});

	test('resolves place-* shorthands into both axes', () => {
		const variables = getFormGridVariables({ placeItems: 'center start', placeContent: 'space-between' }, theme());
		expect(variables['--se-grid-align-items']).toBe('center');
		expect(variables['--se-grid-justify-items']).toBe('start');
		expect(variables['--se-grid-align-content']).toBe('space-between');
		expect(variables['--se-grid-justify-content']).toBe('space-between');
		expect(variables['--se-grid-template']).toBeUndefined();
	});

	test('axis properties beat the place-* shorthand', () => {
		const variables = getFormGridVariables({ placeItems: 'center', justifyItems: 'end' }, theme());
		expect(variables['--se-grid-justify-items']).toBe('end');
		expect(variables['--se-grid-align-items']).toBe('center');
	});

	test('every configured breakpoint resolves to an inline value', () => {
		const variables = getFormGridVariables(
			{ columns: 3, responsive: { sm: { columns: 4 }, '2xl': { columns: 6 } } },
			theme(),
		);
		expect(variables['--se-grid-template']).toBe('repeat(3, minmax(0, 1fr))');
		expect(variables['--se-grid-template-sm']).toBe('repeat(4, minmax(0, 1fr))');
		expect(variables['--se-grid-template-2xl']).toBe('repeat(6, minmax(0, 1fr))');
		for (const breakpoint of ['md', 'lg', 'xl'] as const) {
			expect(variables[`--se-grid-template-${breakpoint}`]).toBeUndefined();
		}
	});
});

describe('getFieldGridVariables', () => {
	test('emits spans and per-breakpoint overrides with forward cascade', () => {
		const variables = getFieldGridVariables({
			column: 'span 2',
			responsive: { md: { column: 'span 3' } },
		});
		expect(variables['--se-field-grid-column']).toBe('span 2');
		expect(variables['--se-field-grid-column-md']).toBe('span 3');
		expect(variables['--se-field-grid-column-lg']).toBeUndefined();
	});

	test('keeps md placement and visibility through wider breakpoints', () => {
		const variables = getFieldGridVariables({
			column: 'span 1',
			responsive: { md: { column: 'span 2', hidden: true } },
		});
		expect(variables['--se-field-grid-column-md']).toBe('span 2');
		expect(variables['--se-field-display-md']).toBe('none');
		expect(variables['--se-field-display']).toBeUndefined();
	});

	test('hidden false can undo an earlier hidden true', () => {
		const variables = getFieldGridVariables({
			responsive: {
				default: { hidden: true },
				md: { hidden: false },
			},
		});
		expect(variables['--se-field-display']).toBe('none');
		expect(variables['--se-field-display-md']).toBe('block');
		expect(variables['--se-field-display-lg']).toBeUndefined();
	});

	test('numeric columns are stringified', () => {
		expect(getFieldGridVariables({ column: 2 })['--se-field-grid-column']).toBe('2');
	});

	test('placeSelf resolves into both axes and joins the cascade', () => {
		const variables = getFieldGridVariables({
			placeSelf: 'center end',
			responsive: { md: { justifySelf: 'start' } },
		});
		expect(variables['--se-field-align-self']).toBe('center');
		expect(variables['--se-field-justify-self']).toBe('end');
		expect(variables['--se-field-justify-self-md']).toBe('start');
		expect(variables['--se-field-align-self-md']).toBeUndefined();
	});

	test('keeps multi-keyword axis values in one axis', () => {
		expect(getFieldGridVariables({ placeSelf: 'safe center' })['--se-field-align-self']).toBe('safe center');
		expect(getFieldGridVariables({ placeSelf: 'safe center' })['--se-field-justify-self']).toBe('safe center');
		expect(getFieldGridVariables({ placeSelf: 'first baseline' })['--se-field-align-self']).toBe('first baseline');
		const split = getFieldGridVariables({ placeSelf: 'safe center unsafe start' });
		expect(split['--se-field-align-self']).toBe('safe center');
		expect(split['--se-field-justify-self']).toBe('unsafe start');
	});

	test('axis properties beat the placeSelf shorthand', () => {
		const variables = getFieldGridVariables({ placeSelf: 'center', alignSelf: 'end' });
		expect(variables['--se-field-align-self']).toBe('end');
		expect(variables['--se-field-justify-self']).toBe('center');
	});

	test('unconfigured fields carry no inline style at all', () => {
		expect(getFieldGridVariables()).toEqual({});
		expect(getFieldGridVariables({})).toEqual({});
	});

	test('emits only the authored properties', () => {
		const variables = getFieldGridVariables({ column: 'span 2' });
		expect(variables).toEqual({ '--se-field-grid-column': 'span 2' });
	});
});
