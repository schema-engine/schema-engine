import { describe, expect, test } from 'vitest';
import {
	compileGridTheme,
	getDefaultCompiledGrid,
	getDefaultGridTheme,
	getFieldGridVariables,
	getFormGridVariables,
} from '@/lib/grid-styles';
import { usesGridWidths } from '@/lib/grid-placement';
import { ElementGridConfigSchema, GridGapTokens, GridLayoutConfigSchema, type GridLayoutConfig } from '@/schemas/grid';

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

	test('a visible field falls back to the component display mode, not block', () => {
		expect(css()).toContain('display:var(--se-field-display, var(--se-field-display-mode, block))');
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
			'grid-column:var(--se-field-grid-column-md, var(--se-field-grid-column-sm, var(--se-field-grid-column, var(--se-grid-default-column, auto))))',
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
	test('maps a gap token to its theme variable on both axes and leaves columns to the stylesheet', () => {
		const variables = getFormGridVariables({ gap: 'loose' }, theme(), []);
		expect(variables['--se-grid-gap-y']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
		expect(variables['--se-grid-gap-x']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
		expect(variables['--se-grid-template']).toBeUndefined();
	});

	test('passes raw CSS gap values through untouched', () => {
		const variables = getFormGridVariables({ gap: '1.5rem' }, theme(), []);
		expect(variables['--se-grid-gap-y']).toBe('1.5rem');
	});

	test('emits nothing when no layout is authored', () => {
		expect(getFormGridVariables(undefined, theme(), [])).toEqual({});
		expect(getFormGridVariables({}, theme(), [])).toEqual({});
	});

	test('sparse responsive entries inherit the preceding breakpoint', () => {
		const grid: GridLayoutConfig = {
			columns: 1,
			responsive: {
				sm: { columns: 2 },
				md: { gap: 'loose' },
			},
		};
		const variables = getFormGridVariables(grid, theme(), []);
		expect(variables['--se-grid-template-sm']).toBe('repeat(2, minmax(0, 1fr))');
		expect(variables['--se-grid-gap-y-md']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
		expect(variables['--se-grid-template']).toBe('repeat(1, minmax(0, 1fr))');
		expect(variables['--se-grid-template-md']).toBeUndefined();
	});

	test('axis gaps beat the entry gap within the same breakpoint', () => {
		const variables = getFormGridVariables({ responsive: { sm: { gap: 'loose', gapX: 'compact' } } }, theme(), []);
		expect(variables['--se-grid-gap-x-sm']).toBe('var(--se-grid-gap-compact, var(--se-grid-gap-base-compact))');
		expect(variables['--se-grid-gap-y-sm']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
	});

	test('responsive.default overrides the top-level baseline', () => {
		const grid: GridLayoutConfig = {
			gap: 'compact',
			responsive: { default: { gap: 'wide', gapY: 'loose' } },
		};
		const variables = getFormGridVariables(grid, theme(), []);
		expect(variables['--se-grid-gap-y']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
		expect(variables['--se-grid-gap-x']).toBe('var(--se-grid-gap-wide, var(--se-grid-gap-base-wide))');
	});

	test('auto columns inline the minimum width into the authored slot', () => {
		const variables = getFormGridVariables({ columns: 'auto', minColumnWidth: '220px' }, theme(), []);
		expect(variables['--se-grid-template']).toBe('repeat(auto-fit, minmax(min(220px, 100%), 1fr))');
	});

	test('a breakpoint that only changes the minimum width re-emits its template', () => {
		const variables = getFormGridVariables(
			{ columns: 'auto', responsive: { md: { minColumnWidth: '10rem' } } },
			theme(),
			[],
		);
		expect(variables['--se-grid-template-md']).toBe('repeat(auto-fit, minmax(min(10rem, 100%), 1fr))');
	});

	test('emits only the authored alignment axes', () => {
		const variables = getFormGridVariables({ justifyItems: 'center' }, theme(), []);
		expect(variables['--se-grid-justify-items']).toBe('center');
		expect(variables['--se-grid-align-items']).toBeUndefined();
		expect(Object.keys(variables).every((key) => key.startsWith('--'))).toBe(true);
	});

	test('keeps multi-keyword alignment values in one axis', () => {
		const variables = getFormGridVariables({ placeContent: 'first baseline' }, theme(), []);
		expect(variables['--se-grid-align-content']).toBe('first baseline');
		expect(variables['--se-grid-justify-content']).toBe('first baseline');
	});

	test('resolves place-* shorthands into both axes', () => {
		const variables = getFormGridVariables(
			{ placeItems: 'center start', placeContent: 'space-between' },
			theme(),
			[],
		);
		expect(variables['--se-grid-align-items']).toBe('center');
		expect(variables['--se-grid-justify-items']).toBe('start');
		expect(variables['--se-grid-align-content']).toBe('space-between');
		expect(variables['--se-grid-justify-content']).toBe('space-between');
		expect(variables['--se-grid-template']).toBeUndefined();
	});

	test('axis properties beat the place-* shorthand', () => {
		const variables = getFormGridVariables({ placeItems: 'center', justifyItems: 'end' }, theme(), []);
		expect(variables['--se-grid-justify-items']).toBe('end');
		expect(variables['--se-grid-align-items']).toBe('center');
	});

	test('every configured breakpoint resolves to an inline value', () => {
		const variables = getFormGridVariables(
			{ columns: 3, responsive: { sm: { columns: 4 }, '2xl': { columns: 6 } } },
			theme(),
			[],
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
		expect(variables['--se-field-display-md']).toBe('var(--se-field-display-mode, block)');
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
		expect(getFieldGridVariables({ placeSelf: 'safe center' })).toEqual({
			'--se-field-align-self': 'safe center',
			'--se-field-justify-self': 'safe center',
		});
		expect(getFieldGridVariables({ placeSelf: 'first baseline' })).toEqual({
			'--se-field-align-self': 'first baseline',
			'--se-field-justify-self': 'first baseline',
		});
		expect(getFieldGridVariables({ placeSelf: 'safe center unsafe start' })).toEqual({
			'--se-field-align-self': 'safe center',
			'--se-field-justify-self': 'unsafe start',
		});
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

describe('responsive gap tokens', () => {
	/** Each media query is emitted as a single line, so this isolates one block exactly. */
	const mediaBlock = (stylesheet: string, minWidth: string) =>
		stylesheet.split('\n').find((line) => line.startsWith(`@media (min-width:${minWidth})`)) ?? '';

	/**
	 * Declarations only. Every media query *references* the base tokens inside
	 * `var()` fallback chains, so a bare substring match cannot tell a
	 * redeclaration from a reference.
	 */
	const declaresAnyGapToken = (block: string) => /[{;]--se-grid-gap-base-[a-z]+:/.test(block);

	const ramped = {
		gap: { default: '1rem' },
		responsive: { md: { default: '1.25rem' }, lg: { default: '1.5rem', loose: '2rem' } },
	} as const;

	test('an unramped theme declares tokens once and never inside a media query', () => {
		const stylesheet = css();
		expect(stylesheet).toContain('--se-grid-gap-base-default:var(--space-stack, 1rem);');
		for (const width of ['40rem', '48rem', '64rem', '80rem', '96rem']) {
			expect(declaresAnyGapToken(mediaBlock(stylesheet, width))).toBe(false);
		}
		expect(theme().responsive).toEqual({});
	});

	test('a ramped token is redeclared only at the widths that change it', () => {
		const stylesheet = css(ramped);
		expect(stylesheet).toContain('--se-grid-gap-base-default:1rem;');
		expect(mediaBlock(stylesheet, '48rem')).toContain('--se-grid-gap-base-default:1.25rem;');
		expect(mediaBlock(stylesheet, '64rem')).toContain('--se-grid-gap-base-default:1.5rem;');
		expect(declaresAnyGapToken(mediaBlock(stylesheet, '40rem'))).toBe(false);
		expect(declaresAnyGapToken(mediaBlock(stylesheet, '96rem'))).toBe(false);
	});

	test('a width declares only the tokens it changes', () => {
		const stylesheet = css(ramped);
		expect(mediaBlock(stylesheet, '48rem')).not.toContain('--se-grid-gap-base-loose:');
		expect(mediaBlock(stylesheet, '64rem')).toContain('--se-grid-gap-base-loose:2rem;');
		expect(mediaBlock(stylesheet, '64rem')).not.toContain('--se-grid-gap-base-compact:');
	});

	test('base values stay in gap and are unaffected by a ramp', () => {
		const resolved = theme(ramped);
		expect(resolved.gap.default).toBe('1rem');
		expect(resolved.gap.loose).toBe('var(--space-block-lg, 1.5rem)');
		expect(resolved.responsive.lg).toEqual({ default: '1.5rem', loose: '2rem' });
	});

	test('theme identity ignores the order breakpoints and tokens were authored in', () => {
		const a = theme({ responsive: { md: { default: '1.25rem', loose: '2rem' }, lg: { default: '1.5rem' } } });
		const b = theme({ responsive: { lg: { default: '1.5rem' }, md: { loose: '2rem', default: '1.25rem' } } });
		expect(a.id).toBe(b.id);
	});

	test('a ramped theme is a different theme from an unramped one', () => {
		expect(theme(ramped).id).not.toBe(theme({ gap: { default: '1rem' } }).id);
	});

	test('an empty responsive entry does not change the theme or its output', () => {
		expect(theme({ responsive: { md: {} } }).id).toBe(theme().id);
		expect(css({ responsive: { md: {} } })).toBe(css());
	});

	test('the ramp is invisible to the form: a token still emits one variable reference', () => {
		const variables = getFormGridVariables({ gap: 'default' }, theme(ramped), []);
		expect(variables['--se-grid-gap-y']).toBe('var(--se-grid-gap-default, var(--se-grid-gap-base-default))');
		expect(variables['--se-grid-gap-x']).toBe('var(--se-grid-gap-default, var(--se-grid-gap-base-default))');
	});

	test('a host override still shadows the whole ramp', () => {
		expect(css(ramped)).not.toMatch(/--se-grid-gap-default:/);
	});
});

describe('per-element spacing', () => {
	test('maps a gap token to the element margin variables', () => {
		const variables = getFieldGridVariables({ marginBlockEnd: 'loose' });
		expect(variables['--se-field-margin-block-end']).toBe(
			'var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))',
		);
		expect(variables['--se-field-margin-block-start']).toBeUndefined();
	});

	test('passes a raw CSS length through untouched', () => {
		expect(getFieldGridVariables({ marginBlockStart: '3rem' })['--se-field-margin-block-start']).toBe('3rem');
	});

	test('emits nothing when no spacing is authored', () => {
		expect(getFieldGridVariables({ column: 2 })['--se-field-margin-block-end']).toBeUndefined();
		expect(getFieldGridVariables()).toEqual({});
	});

	test('spacing joins the responsive cascade per breakpoint', () => {
		const variables = getFieldGridVariables({
			marginBlockEnd: 'compact',
			responsive: { lg: { marginBlockEnd: 'wide' } },
		});
		expect(variables['--se-field-margin-block-end']).toBe(
			'var(--se-grid-gap-compact, var(--se-grid-gap-base-compact))',
		);
		expect(variables['--se-field-margin-block-end-lg']).toBe(
			'var(--se-grid-gap-wide, var(--se-grid-gap-base-wide))',
		);
		expect(variables['--se-field-margin-block-end-md']).toBeUndefined();
	});

	test('the stylesheet defaults element margins to zero and falls back through narrower slots', () => {
		expect(css()).toContain('margin-block-end:var(--se-field-margin-block-end, 0)');
		expect(css()).toContain(
			'margin-block-start:var(--se-field-margin-block-start-sm, var(--se-field-margin-block-start, 0))',
		);
	});

	test('the stylesheet resets every spacing slot so nested fields do not inherit it', () => {
		expect(css()).toContain('--se-field-margin-block-end:initial;');
		expect(css()).toContain('--se-field-margin-block-start-2xl:initial;');
	});
});

const widthElement = (grid: Parameters<typeof getFieldGridVariables>[0]) => ({ $type: 'field', grid });

describe('named widths and offsets', () => {
	test.each([
		['full', 'span 12'],
		['three-quarters', 'span 9'],
		['two-thirds', 'span 8'],
		['half', 'span 6'],
		['third', 'span 4'],
		['quarter', 'span 3'],
	] as const)('width %s emits %s', (width, column) => {
		expect(getFieldGridVariables({ width })).toEqual({ '--se-field-grid-column': column });
	});

	test('offset starts the field after the skipped tracks and runs to the end of the row', () => {
		expect(getFieldGridVariables({ offset: 'quarter' })).toEqual({ '--se-field-grid-column': '4 / -1' });
	});

	test('half with a quarter offset is centred in the 12 tracks', () => {
		expect(getFieldGridVariables({ width: 'half', offset: 'quarter' })).toEqual({
			'--se-field-grid-column': '4 / span 6',
		});
	});

	test('width changes by breakpoint and stays out of unauthored slots', () => {
		const variables = getFieldGridVariables({ width: 'full', responsive: { md: { width: 'third' } } });
		expect(variables).toEqual({
			'--se-field-grid-column': 'span 12',
			'--se-field-grid-column-md': 'span 4',
		});
	});

	test('a slot that changes only the width keeps the offset of the slot before it', () => {
		const variables = getFieldGridVariables({
			width: 'half',
			offset: 'quarter',
			responsive: { md: { width: 'third' } },
		});
		expect(variables['--se-field-grid-column']).toBe('4 / span 6');
		expect(variables['--se-field-grid-column-md']).toBe('4 / span 4');
	});

	test('a slot that changes only the offset keeps the width of the slot before it', () => {
		const variables = getFieldGridVariables({
			width: 'third',
			responsive: { lg: { offset: 'third' } },
		});
		expect(variables['--se-field-grid-column']).toBe('span 4');
		expect(variables['--se-field-grid-column-lg']).toBe('5 / span 4');
	});

	test('responsive.default overrides the top-level width', () => {
		const variables = getFieldGridVariables({ width: 'full', responsive: { default: { width: 'half' } } });
		expect(variables['--se-field-grid-column']).toBe('span 6');
	});

	test('raw column placement still emits the authored line', () => {
		expect(getFieldGridVariables({ column: '4 / 10' })).toEqual({ '--se-field-grid-column': '4 / 10' });
	});

	test('a raw column field beside width fields keeps the twelve tracks and its own lines', () => {
		const elements = [widthElement({ width: 'half' }), widthElement({ column: 'span 2' })];
		expect(getFormGridVariables(undefined, theme(), elements)['--se-grid-template']).toBe(
			'repeat(12, minmax(0, 1fr))',
		);
		expect(getFieldGridVariables({ column: 'span 2' })).toEqual({ '--se-field-grid-column': 'span 2' });
	});

	test('the stylesheet makes a field without a width fill the row when its grid has widths', () => {
		expect(css()).toContain('--se-grid-default-column:initial;');
		expect(css()).toContain('var(--se-field-grid-column, var(--se-grid-default-column, auto))');
	});

	test('a grid whose fields use widths gets twelve tracks and a full-row default', () => {
		const variables = getFormGridVariables(undefined, theme(), [widthElement({ width: 'half' })]);
		expect(variables['--se-grid-template']).toBe('repeat(12, minmax(0, 1fr))');
		expect(variables['--se-grid-default-column']).toBe('1 / -1');
	});

	test('an offset alone also switches the grid to twelve tracks', () => {
		const variables = getFormGridVariables(undefined, theme(), [widthElement({ offset: 'quarter' })]);
		expect(variables['--se-grid-template']).toBe('repeat(12, minmax(0, 1fr))');
	});

	test('a responsive width switches the grid to twelve tracks', () => {
		const variables = getFormGridVariables(undefined, theme(), [
			widthElement({ responsive: { md: { width: 'half' } } }),
		]);
		expect(variables['--se-grid-template']).toBe('repeat(12, minmax(0, 1fr))');
	});

	test('widths keep the authored gap', () => {
		const variables = getFormGridVariables({ gap: '1rem' }, theme(), [widthElement({ width: 'half' })]);
		expect(variables['--se-grid-gap-x']).toBe('1rem');
	});

	test('a grid without widths emits no template or default column', () => {
		const variables = getFormGridVariables(undefined, theme(), [
			widthElement({ column: 'span 2' }),
			{ $type: 'field' },
		]);
		expect(variables).toEqual({});
	});

	test('usesGridWidths ignores elements without grid config', () => {
		expect(usesGridWidths([{ $type: 'field' }, { $type: 'field', grid: {} }])).toBe(false);
		expect(usesGridWidths([{ $type: 'field' }, widthElement({ width: 'half' })])).toBe(true);
		expect(usesGridWidths([widthElement({ width: undefined, offset: undefined })])).toBe(false);
	});
});

describe('named grid areas', () => {
	const drawn = ['a a a b b b', 'a a a c c c', 'd d e e e e'];

	test('a template travels as one custom property with the columns it draws', () => {
		const variables = getFormGridVariables({ areas: drawn }, theme(), []);
		expect(variables['--se-grid-areas']).toBe('"a a a b b b" "a a a c c c" "d d e e e e"');
		expect(variables['--se-grid-template']).toBe('repeat(6, minmax(0, 1fr))');
	});

	test('a responsive record emits one property pair per breakpoint it sets', () => {
		const variables = getFormGridVariables({ areas: { default: ['a', 'b'], md: ['a b'] } }, theme(), []);
		expect(variables['--se-grid-areas']).toBe('"a" "b"');
		expect(variables['--se-grid-template']).toBe('repeat(1, minmax(0, 1fr))');
		expect(variables['--se-grid-areas-md']).toBe('"a b"');
		expect(variables['--se-grid-template-md']).toBe('repeat(2, minmax(0, 1fr))');
		expect(Object.keys(variables).some((name) => name.endsWith('-lg'))).toBe(false);
	});

	test('extra whitespace and empty cells survive normalisation', () => {
		const variables = getFormGridVariables({ areas: ['  a   .  ', 'b ...'] }, theme(), []);
		expect(variables['--se-grid-areas']).toBe('"a ." "b ."');
	});

	test('areas keep the authored gap and add no default column', () => {
		const variables = getFormGridVariables({ gap: 'loose', areas: ['a b'] }, theme(), []);
		expect(variables['--se-grid-gap-x']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
		expect(variables).not.toHaveProperty('--se-grid-default-column');
	});

	test('a grid without areas emits no template areas', () => {
		expect(getFormGridVariables({ columns: 2 }, theme(), [])).not.toHaveProperty('--se-grid-areas');
	});

	test('an element area travels as its column and row', () => {
		expect(getFieldGridVariables({ area: 'a' })).toEqual({
			'--se-field-grid-column': 'a',
			'--se-field-grid-row': 'a',
		});
	});

	test('a responsive area emits only the breakpoint the author wrote', () => {
		const variables = getFieldGridVariables({ area: 'a', responsive: { md: { area: 'b' } } });
		expect(variables).toEqual({
			'--se-field-grid-column': 'a',
			'--se-field-grid-row': 'a',
			'--se-field-grid-column-md': 'b',
			'--se-field-grid-row-md': 'b',
		});
	});

	test('the stylesheet reads the template areas through the breakpoint cascade and resets them', () => {
		expect(css()).toContain('grid-template-areas:var(--se-grid-areas, none);');
		expect(css()).toContain(
			'grid-template-areas:var(--se-grid-areas-md, var(--se-grid-areas-sm, var(--se-grid-areas, none)));',
		);
		expect(css()).toContain('--se-grid-areas:initial;');
		expect(css()).toContain('--se-grid-areas-2xl:initial;');
	});

	test.each([
		['a;color:red'],
		['a"b'],
		['1a'],
		['a b'],
		['auto'],
		['span'],
		['inherit'],
		['none'],
		['default'],
		['initial'],
		['unset'],
		['revert'],
		['revert-layer'],
		[''],
		['a{}'],
	])('rejects %j as an area name', (name) => {
		expect(ElementGridConfigSchema.safeParse({ area: name }).success).toBe(false);
	});

	test.each([['a'], ['street'], ['zip-code'], ['_x'], ['Area2'], ['auto-x'], ['span2'], ['none-of']])(
		'accepts %j as an area name',
		(name) => {
			expect(ElementGridConfigSchema.safeParse({ area: name }).success).toBe(true);
			expect(GridLayoutConfigSchema.safeParse({ areas: [`${name} .`] }).success).toBe(true);
		},
	);

	test('a reserved keyword is not an area name in a template either', () => {
		expect(GridLayoutConfigSchema.safeParse({ areas: ['auto b'] }).success).toBe(false);
	});

	test.each([[['a;b']], [['a "b"']], [[]], [['']], [['   ']], [{ default: [] }], [{ xs: ['a'] }]])(
		'rejects the malformed areas %j',
		(areas) => {
			expect(GridLayoutConfigSchema.safeParse({ areas }).success).toBe(false);
		},
	);

	test('areas are not a responsive grid key', () => {
		expect(GridLayoutConfigSchema.safeParse({ responsive: { md: { areas: ['a'] } } }).success).toBe(false);
	});
});
