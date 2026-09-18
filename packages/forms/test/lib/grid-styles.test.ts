import { describe, expect, test } from 'vitest';
import {
	compileGridTheme,
	getDefaultCompiledGrid,
	getFieldGridHostProps,
	getFieldGridVariables,
	getFormGridVariables,
	getGridThemeCss,
	GRID_GAP_TOKENS,
	gridThemeId,
	resolveGridGap,
	resolveGridTheme,
} from '@/lib/grid-styles';
import type { GridLayoutConfig } from '@/schemas/base-field';

describe('resolveGridTheme', () => {
	test('keeps library defaults for unconfigured tokens', () => {
		const theme = resolveGridTheme();
		expect(theme.breakpoints).toEqual({ sm: '40rem', md: '48rem', lg: '64rem', xl: '80rem', '2xl': '96rem' });
		expect(theme.gap.default).toBe('var(--space-stack, 1rem)');
	});

	test('overrides only the named breakpoint and token', () => {
		const theme = resolveGridTheme({ breakpoints: { md: '50rem' }, gap: { loose: '3rem' } });
		expect(theme.breakpoints.md).toBe('50rem');
		expect(theme.breakpoints.lg).toBe('64rem');
		expect(theme.gap.loose).toBe('3rem');
		expect(theme.gap.compact).toBe('0.5rem');
	});

	test('rejects thresholds without a supported length unit', () => {
		expect(() => resolveGridTheme({ breakpoints: { sm: '640' } })).toThrow(/must be a px, rem, or em length/);
	});

	test('rejects thresholds that invert the named cascade order', () => {
		expect(() => resolveGridTheme({ breakpoints: { sm: '80rem' } })).toThrow(
			/must preserve cascade order sm ≤ md ≤ lg ≤ xl ≤ 2xl/,
		);
	});

	test('compares mixed rem and px thresholds at a 16px root', () => {
		const theme = resolveGridTheme({ breakpoints: { sm: '640px' } });
		expect(theme.breakpoints.sm).toBe('640px');
		expect(theme.breakpoints.md).toBe('48rem');
		expect(() => resolveGridTheme({ breakpoints: { sm: '50rem', md: '700px' } })).toThrow(
			/must preserve cascade order/,
		);
	});

	test('produces a stable identity from normalized options', () => {
		const first = resolveGridTheme({ breakpoints: { lg: '70rem' } });
		const second = resolveGridTheme({ breakpoints: { lg: '70rem' } });
		expect(second.id).toBe(first.id);
		expect(gridThemeId(first)).toBe(first.id);
	});

	test('distinguishes different themes', () => {
		expect(resolveGridTheme().id).not.toBe(resolveGridTheme({ minColumnWidth: '10rem' }).id);
	});

	test('returns a frozen theme graph', () => {
		const theme = resolveGridTheme();
		expect(() => {
			(theme.gap as { default: string }).default = '2rem';
		}).toThrow();
		expect(theme.gap.default).toBe('var(--space-stack, 1rem)');
	});
});

describe('compileGridTheme', () => {
	test('pairs the resolved theme with its stylesheet', () => {
		const compiled = compileGridTheme({ breakpoints: { md: '50rem' } });
		expect(compiled.theme.breakpoints.md).toBe('50rem');
		expect(compiled.css).toBe(getGridThemeCss(compiled.theme));
	});

	test('shares the library-default compiled pair', () => {
		expect(getDefaultCompiledGrid()).toBe(getDefaultCompiledGrid());
		expect(getDefaultCompiledGrid().css).toBe(getGridThemeCss(getDefaultCompiledGrid().theme));
	});
});

describe('getGridThemeCss', () => {
	test('scopes rules to the theme identity', () => {
		const theme = resolveGridTheme();
		const css = getGridThemeCss(theme);
		expect(css).toContain(`.se-form-grid[data-se-grid-theme="${theme.id}"]{`);
		expect(css).not.toMatch(/(^|\n)\.se-form-grid\{/);
	});

	test('scopes field rules to the field host theme attribute', () => {
		const theme = resolveGridTheme();
		const css = getGridThemeCss(theme);
		expect(css).toContain(`.se-form-field[data-se-grid-theme="${theme.id}"]{`);
		expect(css).not.toContain(`.se-form-grid[data-se-grid-theme="${theme.id}"] .se-form-field{`);
	});

	test('generates media queries per configured breakpoint', () => {
		const css = getGridThemeCss(resolveGridTheme({ breakpoints: { sm: '30rem' } }));
		expect(css).toContain('@media (min-width:30rem)');
		expect(css).toContain('@media (min-width:48rem)');
		expect(css).toContain('@media (min-width:64rem)');
	});

	test('defines gap tokens for consumer overrides', () => {
		const css = getGridThemeCss(resolveGridTheme());
		for (const token of GRID_GAP_TOKENS) {
			expect(css).toContain(`--se-grid-gap-${token}:`);
		}
		expect(css).toContain('--se-grid-min-column-width:15.625rem');
	});
});

describe('getFormGridVariables', () => {
	test('emits a single-column baseline for a plain grid', () => {
		const variables = getFormGridVariables({ gap: 'loose' }, resolveGridTheme());
		expect(variables['--se-grid-template']).toBe('repeat(1, minmax(0, 1fr))');
		expect(variables['--se-grid-gap-y']).toBe('var(--se-grid-gap-loose)');
		expect(variables['--se-grid-gap-x']).toBe('var(--se-grid-gap-loose)');
	});

	test('falls back to the theme gap when none is authored', () => {
		const variables = getFormGridVariables(undefined, resolveGridTheme());
		expect(variables['--se-grid-gap-y']).toBe('var(--se-grid-gap-default)');
	});

	test('sparse responsive entries inherit the preceding breakpoint', () => {
		const grid: GridLayoutConfig = {
			columns: 1,
			responsive: {
				sm: { columns: 2 },
				md: { gap: 'loose' },
			},
		};
		const variables = getFormGridVariables(grid, resolveGridTheme());
		expect(variables['--se-grid-template-sm']).toBe('repeat(2, minmax(0, 1fr))');
		expect(variables['--se-grid-template-md']).toBe('repeat(2, minmax(0, 1fr))');
		expect(variables['--se-grid-gap-y-md']).toBe('var(--se-grid-gap-loose)');
		expect(variables['--se-grid-template']).toBe('repeat(1, minmax(0, 1fr))');
	});

	test('axis gaps beat the entry gap within the same breakpoint', () => {
		const grid: GridLayoutConfig = {
			responsive: {
				sm: { gap: 'loose', gapX: 'compact' },
			},
		};
		const variables = getFormGridVariables(grid, resolveGridTheme());
		expect(variables['--se-grid-gap-x-sm']).toBe('var(--se-grid-gap-compact)');
		expect(variables['--se-grid-gap-y-sm']).toBe('var(--se-grid-gap-loose)');
	});

	test('responsive.default overrides the top-level baseline', () => {
		const grid: GridLayoutConfig = {
			gap: 'compact',
			responsive: { default: { gap: 'wide', gapY: 'loose' } },
		};
		const variables = getFormGridVariables(grid, resolveGridTheme());
		expect(variables['--se-grid-gap-y']).toBe('var(--se-grid-gap-loose)');
		expect(variables['--se-grid-gap-x']).toBe('var(--se-grid-gap-wide)');
	});

	test('auto columns emit the auto-fit template with the min width variable', () => {
		const grid: GridLayoutConfig = { columns: 'auto', minColumnWidth: '220px' };
		const variables = getFormGridVariables(grid, resolveGridTheme());
		expect(variables['--se-grid-template']).toBe('repeat(auto-fit, minmax(min(220px, 100%), 1fr))');
		expect(variables['--se-grid-min-column-width']).toBe('220px');
		expect(variables['--se-grid-template-md']).toContain('repeat(auto-fit, minmax(min(220px, 100%), 1fr))');
	});

	test('emits alignment as custom properties with nested-grid defaults', () => {
		const variables = getFormGridVariables(
			{ justifyItems: 'center', placeContent: 'space-between' },
			resolveGridTheme(),
		);
		expect(variables['--se-grid-justify-items']).toBe('center');
		expect(variables['--se-grid-place-content']).toBe('space-between');
		expect(variables['--se-grid-align-content']).toBe('start');
		expect(Object.keys(variables).every((key) => key.startsWith('--'))).toBe(true);
	});

	test('every configured breakpoint resolves to an inline value', () => {
		const variables = getFormGridVariables({ columns: 3 }, resolveGridTheme());
		for (const breakpoint of ['sm', 'md', 'lg', 'xl', '2xl'] as const) {
			expect(variables[`--se-grid-template-${breakpoint}`]).toBe('repeat(3, minmax(0, 1fr))');
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
		expect(variables['--se-field-grid-column-lg']).toBe('span 3');
	});

	test('keeps md placement and visibility through wider breakpoints', () => {
		const variables = getFieldGridVariables({
			column: 'span 1',
			responsive: { md: { column: 'span 2', hidden: true } },
		});
		expect(variables['--se-field-grid-column-lg']).toBe('span 2');
		expect(variables['--se-field-display-lg']).toBe('none');
		expect(variables['--se-field-display']).toBe('block');
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
		expect(variables['--se-field-display-lg']).toBe('block');
	});

	test('numeric columns are stringified', () => {
		const variables = getFieldGridVariables({ column: 2 });
		expect(variables['--se-field-grid-column']).toBe('2');
	});

	test('unconfigured fields emit neutral defaults at every breakpoint', () => {
		const variables = getFieldGridVariables();
		expect(variables['--se-field-grid-column']).toBe('auto');
		expect(variables['--se-field-grid-column-lg']).toBe('auto');
		expect(variables['--se-field-display-lg']).toBe('block');
		expect(variables['--se-field-place-self']).toBe('auto');
		expect(Object.keys(variables).every((key) => key.startsWith('--'))).toBe(true);
	});
});

describe('getFieldGridHostProps', () => {
	test('returns theme id and field variables without a computed attribute key', () => {
		const host = getFieldGridHostProps('gtheme', { column: 2 });
		expect(host.themeId).toBe('gtheme');
		expect(host.style['--se-field-grid-column']).toBe('2');
	});
});

describe('resolveGridGap', () => {
	test('maps tokens to their theme variables', () => {
		expect(resolveGridGap('loose')).toBe('var(--se-grid-gap-loose)');
	});

	test('passes raw CSS values through', () => {
		expect(resolveGridGap('1.5rem')).toBe('1.5rem');
		expect(resolveGridGap(undefined)).toBeUndefined();
	});
});
