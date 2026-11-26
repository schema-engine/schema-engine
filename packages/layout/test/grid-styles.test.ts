import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { getGridItemVariables, getGridVariables, type GridThemeOptions } from '@/lib/grid-styles';
import { createLayoutTheme, getDefaultLayoutTheme } from '@/lib/layout-theme';
import { usesGridWidths } from '@/lib/grid-placement';
import { computeElement } from './resolve-stylesheet';
import { ElementGridConfigSchema, GridGapTokens, GridLayoutConfigSchema, type GridLayoutConfig } from '@/schemas/grid';

const layout = (grid?: GridThemeOptions) => createLayoutTheme({ grid });
const theme = (grid?: GridThemeOptions) => layout(grid).grid;
const css = (grid?: GridThemeOptions) => layout(grid).css;
const themeId = (grid?: GridThemeOptions) => layout(grid).id;

describe('the grid half of a layout theme', () => {
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
		expect(themeId({ breakpoints: { lg: '70rem' } })).toBe(themeId({ breakpoints: { lg: '70rem' } }));
		expect(themeId()).not.toBe(themeId({ minColumnWidth: '10rem' }));
	});

	test('returns a frozen theme graph', () => {
		const resolved = theme();
		expect(() => {
			(resolved.gap as { default: string }).default = '2rem';
		}).toThrow();
		expect(resolved.gap.default).toBe('var(--space-stack, 1rem)');
	});

	test('shares the library-default theme', () => {
		expect(getDefaultLayoutTheme()).toBe(getDefaultLayoutTheme());
		expect(getDefaultLayoutTheme().grid).toEqual(theme());
	});
});

describe('generated stylesheet', () => {
	test('scopes rules to the theme identity', () => {
		expect(css()).toContain(`.se-grid[data-se-theme="${themeId()}"]{`);
		expect(css()).not.toMatch(/(^|\n)\.se-grid\{/);
	});

	test('scopes field rules to the field host theme attribute', () => {
		expect(css()).toContain(`.se-grid-item[data-se-theme="${themeId()}"]{`);
		expect(css()).not.toContain(`.se-grid[data-se-theme="${themeId()}"] .se-form-field{`);
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
		const sheet = layout();
		const item = (inline: Record<string, string> = {}) =>
			computeElement(sheet.css, sheet.id, 'item', 1200, { inline }).value('display');
		expect(item()).toBe('block');
		expect(item({ '--se-item-display-mode': 'flex' })).toBe('flex');
		expect(item({ '--se-item-display-mode': 'flex', '--se-item-display': 'none' })).toBe('none');
	});

	test('declares no place-* shorthand that would reset the axis longhands', () => {
		expect(css()).not.toMatch(/place-(items|content|self):/);
	});

	test('defaults field alignment to auto so the grid alignment still applies', () => {
		const sheet = layout();
		const item = computeElement(sheet.css, sheet.id, 'item', 1200);
		expect(item.value('justify-self')).toBe('auto');
		expect(item.value('align-self')).toBe('auto');
	});

	const properties = {
		grid: [
			['grid-template-columns', 'se-grid-template'],
			['grid-template-areas', 'se-grid-areas'],
			['row-gap', 'se-grid-gap-y'],
			['column-gap', 'se-grid-gap-x'],
		],
		item: [
			['display', 'se-item-display'],
			['grid-column', 'se-item-grid-column'],
			['grid-row', 'se-item-grid-row'],
			['justify-self', 'se-item-justify-self'],
			['align-self', 'se-item-align-self'],
			['margin-block-start', 'se-item-margin-block-start'],
			['margin-block-end', 'se-item-margin-block-end'],
		],
	} as const;

	test.each(['grid', 'item'] as const)('a %s slot applies from its breakpoint up, for every property', (kind) => {
		const sheet = layout();
		for (const [property, variable] of properties[kind]) {
			const at = (width: number) =>
				computeElement(sheet.css, sheet.id, kind, width, {
					inline: { [`--${variable}`]: 'base', [`--${variable}-md`]: 'md', [`--${variable}-2xl`]: 'wide' },
				}).value(property);
			expect([at(100), at(767), at(768), at(1535), at(1536)], property).toEqual([
				'base',
				'base',
				'md',
				'md',
				'wide',
			]);
		}
	});

	test('a slot applies at the threshold of a configured breakpoint', () => {
		const sheet = layout({ breakpoints: { md: '50rem' } });
		const at = (width: number) =>
			computeElement(sheet.css, sheet.id, 'item', width, {
				inline: { '--se-item-grid-row': '1', '--se-item-grid-row-md': '2' },
			}).value('grid-row');
		expect([at(799), at(800)]).toEqual(['1', '2']);
	});

	test('a slot an author left unset falls back through the narrower slots', () => {
		const sheet = layout();
		const at = (width: number) =>
			computeElement(sheet.css, sheet.id, 'item', width, {
				inline: { '--se-item-grid-column': 'span 2', '--se-item-grid-column-md': 'span 3' },
			}).value('grid-column');
		expect([at(500), at(700), at(800), at(1100), at(1700)]).toEqual([
			'span 2',
			'span 2',
			'span 3',
			'span 3',
			'span 3',
		]);
	});

	test('an element that sets nothing computes the neutral defaults at every width', () => {
		const sheet = layout();
		for (const width of [320, 700, 1200, 1700]) {
			const grid = computeElement(sheet.css, sheet.id, 'grid', width);
			expect(grid.value('grid-template-columns')).toBe('repeat(1,minmax(0,1fr))');
			expect(grid.value('grid-template-areas')).toBe('none');
			expect(grid.value('row-gap')).toBe('1rem');
			expect(grid.value('column-gap')).toBe('1rem');
			expect(grid.value('justify-items')).toBe('normal');
		}
		const hosted = computeElement(sheet.css, sheet.id, 'grid', 700, {
			inherited: { '--se-grid-gap-default': '3rem' },
		});
		expect(hosted.value('row-gap')).toBe('3rem');
	});

	test('resets every slot so nested grids and fields do not inherit placement', () => {
		const sheet = layout();
		for (const kind of ['grid', 'item'] as const) {
			const inherited = Object.fromEntries(
				properties[kind].flatMap(([, variable]) =>
					['', '-sm', '-md', '-lg', '-xl', '-2xl'].map((slot) => [`--${variable}${slot}`, 'parent']),
				),
			);
			const child = computeElement(sheet.css, sheet.id, kind, 1700, { inherited });
			for (const [property, variable] of properties[kind]) {
				for (const slot of ['', '-sm', '-md', '-lg', '-xl', '-2xl']) {
					expect(child.custom[`--${variable}${slot}`], `${variable}${slot}`).toBeUndefined();
				}
				expect(child.value(property), property).not.toBe('parent');
			}
		}
		const grid = computeElement(sheet.css, sheet.id, 'grid', 1700, {
			inherited: { '--se-grid-align-content': 'parent' },
		});
		expect(grid.value('align-content')).toBe('start');
	});

	test('a grid resets the display mode so its items do not inherit the mode of the item that holds it', () => {
		const sheet = layout();
		const grid = computeElement(sheet.css, sheet.id, 'grid', 1700, {
			inherited: { '--se-item-display-mode': 'grid' },
		});
		expect(grid.custom['--se-item-display-mode']).toBeUndefined();
		expect(computeElement(sheet.css, sheet.id, 'item', 1700).value('display')).toBe('block');
	});

	test('a theme does not read the slots an ancestor theme with other breakpoints declared', () => {
		const outer = layout();
		const inner = layout({ breakpoints: { md: '60rem' } });
		const parent = computeElement(outer.css, outer.id, 'item', 800, {
			inline: { '--se-item-grid-column-md': 'span 6' },
		});
		expect(parent.value('grid-column')).toBe('span 6');
		const child = computeElement(inner.css, inner.id, 'item', 800, { inherited: parent.custom });
		expect(child.value('grid-column')).toBe('auto');
	});
});

describe('getGridVariables', () => {
	test('maps a gap token to its theme variable on both axes and leaves columns to the stylesheet', () => {
		const variables = getGridVariables({ gap: 'loose' }, theme(), []);
		expect(variables['--se-grid-gap-y']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
		expect(variables['--se-grid-gap-x']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
		expect(variables['--se-grid-template']).toBeUndefined();
	});

	test('passes raw CSS gap values through untouched', () => {
		const variables = getGridVariables({ gap: '1.5rem' }, theme(), []);
		expect(variables['--se-grid-gap-y']).toBe('1.5rem');
	});

	test('emits nothing when no layout is authored', () => {
		expect(getGridVariables(undefined, theme(), [])).toEqual({});
		expect(getGridVariables({}, theme(), [])).toEqual({});
	});

	test('sparse responsive entries inherit the preceding breakpoint', () => {
		const grid: GridLayoutConfig = {
			columns: 1,
			responsive: {
				sm: { columns: 2 },
				md: { gap: 'loose' },
			},
		};
		const variables = getGridVariables(grid, theme(), []);
		expect(variables['--se-grid-template-sm']).toBe('repeat(2, minmax(0, 1fr))');
		expect(variables['--se-grid-gap-y-md']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
		expect(variables['--se-grid-template']).toBe('repeat(1, minmax(0, 1fr))');
		expect(variables['--se-grid-template-md']).toBeUndefined();
	});

	test('axis gaps beat the entry gap within the same breakpoint', () => {
		const variables = getGridVariables({ responsive: { sm: { gap: 'loose', gapX: 'compact' } } }, theme(), []);
		expect(variables['--se-grid-gap-x-sm']).toBe('var(--se-grid-gap-compact, var(--se-grid-gap-base-compact))');
		expect(variables['--se-grid-gap-y-sm']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
	});

	test('responsive.default overrides the top-level baseline', () => {
		const grid: GridLayoutConfig = {
			gap: 'compact',
			responsive: { default: { gap: 'wide', gapY: 'loose' } },
		};
		const variables = getGridVariables(grid, theme(), []);
		expect(variables['--se-grid-gap-y']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
		expect(variables['--se-grid-gap-x']).toBe('var(--se-grid-gap-wide, var(--se-grid-gap-base-wide))');
	});

	test('auto columns inline the minimum width into the authored slot', () => {
		const variables = getGridVariables({ columns: 'auto', minColumnWidth: '220px' }, theme(), []);
		expect(variables['--se-grid-template']).toBe('repeat(auto-fit, minmax(min(220px, 100%), 1fr))');
	});

	test('a breakpoint that only changes the minimum width re-emits its template', () => {
		const variables = getGridVariables(
			{ columns: 'auto', responsive: { md: { minColumnWidth: '10rem' } } },
			theme(),
			[],
		);
		expect(variables['--se-grid-template-md']).toBe('repeat(auto-fit, minmax(min(10rem, 100%), 1fr))');
	});

	test('emits only the authored alignment axes', () => {
		const variables = getGridVariables({ justifyItems: 'center' }, theme(), []);
		expect(variables['--se-grid-justify-items']).toBe('center');
		expect(variables['--se-grid-align-items']).toBeUndefined();
		expect(Object.keys(variables).every((key) => key.startsWith('--'))).toBe(true);
	});

	test('keeps multi-keyword alignment values in one axis', () => {
		const variables = getGridVariables({ placeContent: 'first baseline' }, theme(), []);
		expect(variables['--se-grid-align-content']).toBe('first baseline');
		expect(variables['--se-grid-justify-content']).toBe('first baseline');
	});

	test('resolves place-* shorthands into both axes', () => {
		const variables = getGridVariables({ placeItems: 'center start', placeContent: 'space-between' }, theme(), []);
		expect(variables['--se-grid-align-items']).toBe('center');
		expect(variables['--se-grid-justify-items']).toBe('start');
		expect(variables['--se-grid-align-content']).toBe('space-between');
		expect(variables['--se-grid-justify-content']).toBe('space-between');
		expect(variables['--se-grid-template']).toBeUndefined();
	});

	test('axis properties beat the place-* shorthand', () => {
		const variables = getGridVariables({ placeItems: 'center', justifyItems: 'end' }, theme(), []);
		expect(variables['--se-grid-justify-items']).toBe('end');
		expect(variables['--se-grid-align-items']).toBe('center');
	});

	test('every configured breakpoint resolves to an inline value', () => {
		const variables = getGridVariables(
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

describe('getGridItemVariables', () => {
	test('emits spans and per-breakpoint overrides with forward cascade', () => {
		const variables = getGridItemVariables({
			column: 'span 2',
			responsive: { md: { column: 'span 3' } },
		});
		expect(variables['--se-item-grid-column']).toBe('span 2');
		expect(variables['--se-item-grid-column-md']).toBe('span 3');
		expect(variables['--se-item-grid-column-lg']).toBeUndefined();
	});

	test('keeps md placement and visibility through wider breakpoints', () => {
		const variables = getGridItemVariables({
			column: 'span 1',
			responsive: { md: { column: 'span 2', hidden: true } },
		});
		expect(variables['--se-item-grid-column-md']).toBe('span 2');
		expect(variables['--se-item-display-md']).toBe('none');
		expect(variables['--se-item-display']).toBeUndefined();
	});

	test('hidden false can undo an earlier hidden true', () => {
		const variables = getGridItemVariables({
			responsive: {
				default: { hidden: true },
				md: { hidden: false },
			},
		});
		expect(variables['--se-item-display']).toBe('none');
		expect(variables['--se-item-display-md']).toBe('var(--se-item-display-mode, block)');
		expect(variables['--se-item-display-lg']).toBeUndefined();
	});

	test('numeric columns are stringified', () => {
		expect(getGridItemVariables({ column: 2 })['--se-item-grid-column']).toBe('2');
	});

	test('placeSelf resolves into both axes and joins the cascade', () => {
		const variables = getGridItemVariables({
			placeSelf: 'center end',
			responsive: { md: { justifySelf: 'start' } },
		});
		expect(variables['--se-item-align-self']).toBe('center');
		expect(variables['--se-item-justify-self']).toBe('end');
		expect(variables['--se-item-justify-self-md']).toBe('start');
		expect(variables['--se-item-align-self-md']).toBeUndefined();
	});

	test('keeps multi-keyword axis values in one axis', () => {
		expect(getGridItemVariables({ placeSelf: 'safe center' })).toEqual({
			'--se-item-align-self': 'safe center',
			'--se-item-justify-self': 'safe center',
		});
		expect(getGridItemVariables({ placeSelf: 'first baseline' })).toEqual({
			'--se-item-align-self': 'first baseline',
			'--se-item-justify-self': 'first baseline',
		});
		expect(getGridItemVariables({ placeSelf: 'safe center unsafe start' })).toEqual({
			'--se-item-align-self': 'safe center',
			'--se-item-justify-self': 'unsafe start',
		});
	});

	test('axis properties beat the placeSelf shorthand', () => {
		const variables = getGridItemVariables({ placeSelf: 'center', alignSelf: 'end' });
		expect(variables['--se-item-align-self']).toBe('end');
		expect(variables['--se-item-justify-self']).toBe('center');
	});

	test('unconfigured fields carry no inline style at all', () => {
		expect(getGridItemVariables()).toEqual({});
		expect(getGridItemVariables({})).toEqual({});
	});

	test('emits only the authored properties', () => {
		const variables = getGridItemVariables({ column: 'span 2' });
		expect(variables).toEqual({ '--se-item-grid-column': 'span 2' });
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
		const a = themeId({ responsive: { md: { default: '1.25rem', loose: '2rem' }, lg: { default: '1.5rem' } } });
		const b = themeId({ responsive: { lg: { default: '1.5rem' }, md: { loose: '2rem', default: '1.25rem' } } });
		expect(a).toBe(b);
	});

	test('a ramped theme is a different theme from an unramped one', () => {
		expect(themeId(ramped)).not.toBe(themeId({ gap: { default: '1rem' } }));
	});

	test('an empty responsive entry does not change the theme or its output', () => {
		expect(themeId({ responsive: { md: {} } })).toBe(themeId());
		expect(css({ responsive: { md: {} } })).toBe(css());
	});

	test('the ramp is invisible to the form: a token still emits one variable reference', () => {
		const variables = getGridVariables({ gap: 'default' }, theme(ramped), []);
		expect(variables['--se-grid-gap-y']).toBe('var(--se-grid-gap-default, var(--se-grid-gap-base-default))');
		expect(variables['--se-grid-gap-x']).toBe('var(--se-grid-gap-default, var(--se-grid-gap-base-default))');
	});

	test('a host override still shadows the whole ramp', () => {
		expect(css(ramped)).not.toMatch(/--se-grid-gap-default:/);
	});
});

describe('per-element spacing', () => {
	test('maps a gap token to the element margin variables', () => {
		const variables = getGridItemVariables({ marginBlockEnd: 'loose' });
		expect(variables['--se-item-margin-block-end']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
		expect(variables['--se-item-margin-block-start']).toBeUndefined();
	});

	test('passes a raw CSS length through untouched', () => {
		expect(getGridItemVariables({ marginBlockStart: '3rem' })['--se-item-margin-block-start']).toBe('3rem');
	});

	test('emits nothing when no spacing is authored', () => {
		expect(getGridItemVariables({ column: 2 })['--se-item-margin-block-end']).toBeUndefined();
		expect(getGridItemVariables()).toEqual({});
	});

	test('spacing joins the responsive cascade per breakpoint', () => {
		const variables = getGridItemVariables({
			marginBlockEnd: 'compact',
			responsive: { lg: { marginBlockEnd: 'wide' } },
		});
		expect(variables['--se-item-margin-block-end']).toBe(
			'var(--se-grid-gap-compact, var(--se-grid-gap-base-compact))',
		);
		expect(variables['--se-item-margin-block-end-lg']).toBe(
			'var(--se-grid-gap-wide, var(--se-grid-gap-base-wide))',
		);
		expect(variables['--se-item-margin-block-end-md']).toBeUndefined();
	});

	test('the stylesheet defaults element margins to zero and falls back through narrower slots', () => {
		const sheet = layout();
		const margin = (width: number, inline: Record<string, string> = {}) =>
			computeElement(sheet.css, sheet.id, 'item', width, { inline });
		expect(margin(1200).value('margin-block-end')).toBe('0');
		expect(margin(1200).value('margin-block-start')).toBe('0');
		const inline = { '--se-item-margin-block-start': '1rem', '--se-item-margin-block-start-lg': '2rem' };
		expect([320, 700, 1100].map((width) => margin(width, inline).value('margin-block-start'))).toEqual([
			'1rem',
			'1rem',
			'2rem',
		]);
	});

	test('the stylesheet resets every spacing slot so nested fields do not inherit it', () => {
		const sheet = layout();
		const child = computeElement(sheet.css, sheet.id, 'item', 1700, {
			inherited: { '--se-item-margin-block-end': '3rem', '--se-item-margin-block-start-2xl': '3rem' },
		});
		expect(child.value('margin-block-end')).toBe('0');
		expect(child.value('margin-block-start')).toBe('0');
	});
});

const widthElement = (grid: Parameters<typeof getGridItemVariables>[0]) => ({ $type: 'field', grid });

describe('named widths and offsets', () => {
	test.each([
		['full', 'span 12'],
		['three-quarters', 'span 9'],
		['two-thirds', 'span 8'],
		['half', 'span 6'],
		['third', 'span 4'],
		['quarter', 'span 3'],
	] as const)('width %s emits %s', (width, column) => {
		expect(getGridItemVariables({ width })).toEqual({ '--se-item-grid-column': column });
	});

	test('offset starts the field after the skipped tracks and runs to the end of the row', () => {
		expect(getGridItemVariables({ offset: 'quarter' })).toEqual({ '--se-item-grid-column': '4 / -1' });
	});

	test('half with a quarter offset is centred in the 12 tracks', () => {
		expect(getGridItemVariables({ width: 'half', offset: 'quarter' })).toEqual({
			'--se-item-grid-column': '4 / span 6',
		});
	});

	test('width changes by breakpoint and stays out of unauthored slots', () => {
		const variables = getGridItemVariables({ width: 'full', responsive: { md: { width: 'third' } } });
		expect(variables).toEqual({
			'--se-item-grid-column': 'span 12',
			'--se-item-grid-column-md': 'span 4',
		});
	});

	test('a slot that changes only the width keeps the offset of the slot before it', () => {
		const variables = getGridItemVariables({
			width: 'half',
			offset: 'quarter',
			responsive: { md: { width: 'third' } },
		});
		expect(variables['--se-item-grid-column']).toBe('4 / span 6');
		expect(variables['--se-item-grid-column-md']).toBe('4 / span 4');
	});

	test('a slot that changes only the offset keeps the width of the slot before it', () => {
		const variables = getGridItemVariables({
			width: 'third',
			responsive: { lg: { offset: 'third' } },
		});
		expect(variables['--se-item-grid-column']).toBe('span 4');
		expect(variables['--se-item-grid-column-lg']).toBe('5 / span 4');
	});

	test('responsive.default overrides the top-level width', () => {
		const variables = getGridItemVariables({ width: 'full', responsive: { default: { width: 'half' } } });
		expect(variables['--se-item-grid-column']).toBe('span 6');
	});

	test('raw column placement still emits the authored line', () => {
		expect(getGridItemVariables({ column: '4 / 10' })).toEqual({ '--se-item-grid-column': '4 / 10' });
	});

	test('a raw column field beside width fields keeps the twelve tracks and its own lines', () => {
		const elements = [widthElement({ width: 'half' }), widthElement({ column: 'span 2' })];
		expect(getGridVariables(undefined, theme(), elements)['--se-grid-template']).toBe('repeat(12, minmax(0, 1fr))');
		expect(getGridItemVariables({ column: 'span 2' })).toEqual({ '--se-item-grid-column': 'span 2' });
	});

	test('the stylesheet makes a field without a width fill the row when its grid has widths', () => {
		const sheet = layout();
		const field = (inline: Record<string, string> = {}) =>
			computeElement(sheet.css, sheet.id, 'item', 1200, {
				inherited: { '--se-grid-default-column': '1 / -1' },
				inline,
			}).value('grid-column');
		expect(field()).toBe('1 / -1');
		expect(field({ '--se-item-grid-column': 'span 6' })).toBe('span 6');
		expect(computeElement(sheet.css, sheet.id, 'item', 1200).value('grid-column')).toBe('auto');
		expect(
			computeElement(sheet.css, sheet.id, 'grid', 1200, { inherited: { '--se-grid-default-column': '1 / -1' } })
				.custom['--se-grid-default-column'],
		).toBeUndefined();
	});

	test('a grid whose fields use widths gets twelve tracks and a full-row default', () => {
		const variables = getGridVariables(undefined, theme(), [widthElement({ width: 'half' })]);
		expect(variables['--se-grid-template']).toBe('repeat(12, minmax(0, 1fr))');
		expect(variables['--se-grid-default-column']).toBe('1 / -1');
	});

	test('an offset alone also switches the grid to twelve tracks', () => {
		const variables = getGridVariables(undefined, theme(), [widthElement({ offset: 'quarter' })]);
		expect(variables['--se-grid-template']).toBe('repeat(12, minmax(0, 1fr))');
	});

	test('a responsive width switches the grid to twelve tracks', () => {
		const variables = getGridVariables(undefined, theme(), [
			widthElement({ responsive: { md: { width: 'half' } } }),
		]);
		expect(variables['--se-grid-template']).toBe('repeat(12, minmax(0, 1fr))');
	});

	test('widths keep the authored gap', () => {
		const variables = getGridVariables({ gap: '1rem' }, theme(), [widthElement({ width: 'half' })]);
		expect(variables['--se-grid-gap-x']).toBe('1rem');
	});

	test('a grid without widths emits no template or default column', () => {
		const variables = getGridVariables(undefined, theme(), [
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
		const variables = getGridVariables({ areas: drawn }, theme(), []);
		expect(variables['--se-grid-areas']).toBe('"a a a b b b" "a a a c c c" "d d e e e e"');
		expect(variables['--se-grid-template']).toBe('repeat(6, minmax(0, 1fr))');
	});

	test('a responsive record emits one property pair per breakpoint it sets', () => {
		const variables = getGridVariables({ areas: { default: ['a', 'b'], md: ['a b'] } }, theme(), []);
		expect(variables['--se-grid-areas']).toBe('"a" "b"');
		expect(variables['--se-grid-template']).toBe('repeat(1, minmax(0, 1fr))');
		expect(variables['--se-grid-areas-md']).toBe('"a b"');
		expect(variables['--se-grid-template-md']).toBe('repeat(2, minmax(0, 1fr))');
		expect(Object.keys(variables).some((name) => name.endsWith('-lg'))).toBe(false);
	});

	test('extra whitespace and empty cells survive normalisation', () => {
		const variables = getGridVariables({ areas: ['  a   .  ', 'b ...'] }, theme(), []);
		expect(variables['--se-grid-areas']).toBe('"a ." "b ."');
	});

	test('areas keep the authored gap and add no default column', () => {
		const variables = getGridVariables({ gap: 'loose', areas: ['a b'] }, theme(), []);
		expect(variables['--se-grid-gap-x']).toBe('var(--se-grid-gap-loose, var(--se-grid-gap-base-loose))');
		expect(variables).not.toHaveProperty('--se-grid-default-column');
	});

	test('a grid without areas emits no template areas', () => {
		expect(getGridVariables({ columns: 2 }, theme(), [])).not.toHaveProperty('--se-grid-areas');
	});

	test('an element area travels as its column and row', () => {
		expect(getGridItemVariables({ area: 'a' })).toEqual({
			'--se-item-grid-column': 'a',
			'--se-item-grid-row': 'a',
		});
	});

	test('a responsive area emits only the breakpoint the author wrote', () => {
		const variables = getGridItemVariables({ area: 'a', responsive: { md: { area: 'b' } } });
		expect(variables).toEqual({
			'--se-item-grid-column': 'a',
			'--se-item-grid-row': 'a',
			'--se-item-grid-column-md': 'b',
			'--se-item-grid-row-md': 'b',
		});
	});

	test('the stylesheet reads the template areas through the breakpoint cascade and resets them', () => {
		const sheet = layout();
		const areas = (width: number, inline: Record<string, string> = {}) =>
			computeElement(sheet.css, sheet.id, 'grid', width, { inline }).value('grid-template-areas');
		const inline = { '--se-grid-areas': '"a"', '--se-grid-areas-md': '"a b"' };
		expect([areas(1200), areas(320, inline), areas(700, inline), areas(800, inline), areas(1700, inline)]).toEqual([
			'none',
			'"a"',
			'"a"',
			'"a b"',
			'"a b"',
		]);
		const nested = computeElement(sheet.css, sheet.id, 'grid', 1700, {
			inherited: { '--se-grid-areas': '"a"', '--se-grid-areas-2xl': '"a b"' },
		});
		expect(nested.value('grid-template-areas')).toBe('none');
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

describe('the query mode of a layout theme', () => {
	const ramped = {
		responsive: { md: { default: '1.25rem' }, lg: { default: '1.5rem', loose: '2rem' } },
		breakpoints: { md: '50rem' },
	} as const;
	const BREAKPOINT_WIDTHS = ['40rem', '50rem', '64rem', '80rem', '96rem'];
	const queryBlock = (stylesheet: string, atRule: string, minWidth: string) =>
		stylesheet.split('\n').find((line) => line.startsWith(`${atRule} (min-width:${minWidth})`)) ?? '';

	test('a theme without the option is the stylesheet it was before the option existed', () => {
		const fingerprint = (stylesheet: string) => createHash('sha256').update(stylesheet).digest('hex');
		expect(layout().id).toBe('l1tvu4rv');
		expect(fingerprint(layout().css)).toBe('f9328bc203ab311cf795d976c88d3859ff0eb40b3d775c9ecc9dc5d815e244d3');
		expect(layout(ramped).id).toBe('l18hlk5k');
		expect(fingerprint(layout(ramped).css)).toBe(
			'8037a078d6108414d8d7c2de8cb2860655eb5306db82c921cdc215d3042fe50a',
		);
	});

	test('media is the default, and naming it changes nothing', () => {
		expect(theme().query).toBe('media');
		expect(layout({ query: 'media' }).css).toBe(layout().css);
		expect(layout({ query: 'media' }).id).toBe(layout().id);
		expect(css(ramped)).not.toContain('@container');
		expect(css(ramped)).not.toContain('container-type');
	});

	test('container mode emits @container for every breakpoint and no @media', () => {
		const stylesheet = css({ ...ramped, query: 'container' });
		expect(stylesheet).not.toContain('@media');
		for (const width of BREAKPOINT_WIDTHS) {
			expect(queryBlock(stylesheet, '@container se-grid', width)).not.toBe('');
		}
	});

	test('container mode moves the gap ramp with the grid and item gates', () => {
		const stylesheet = css({ ...ramped, query: 'container' });
		const medium = queryBlock(stylesheet, '@container se-grid', '50rem');
		expect(medium).toContain('--se-grid-gap-base-default:1.25rem;');
		expect(queryBlock(stylesheet, '@container se-grid', '64rem')).toContain('--se-grid-gap-base-loose:2rem;');
		expect(medium).toContain('.se-grid[data-se-theme=');
		expect(medium).toContain('.se-grid-item[data-se-theme=');
	});

	test('container mode changes the at-rule and adds the container rule and the gate resets', () => {
		const media = layout(ramped);
		const container = layout({ ...ramped, query: 'container' });
		const gateReset = new RegExp(`--${container.id}-[gi]\\d+(?:sm|md|lg|xl|2xl):initial;`, 'g');
		const rewritten = container.css
			.split('\n')
			.filter((line) => !line.startsWith('.se-grid-container'))
			.map((line) =>
				line.replace('@container se-grid', '@media').replace(gateReset, '').replaceAll(container.id, media.id),
			)
			.join('\n');
		expect(rewritten).toBe(media.css);
	});

	test('container mode resets, on each grid and item, every gate a query block declares', () => {
		const sheet = layout({ ...ramped, query: 'container' });
		const lines = sheet.css.split('\n');
		const declared = (rule: string) =>
			new Set(
				Array.from(rule.matchAll(new RegExp(`--${sheet.id}-[gi]\\d+(?:sm|md|lg|xl|2xl):`, 'g')), (m) => m[0]),
			);
		const base = (scope: string) => lines.find((line) => line.startsWith(`${scope}[data-se-theme=`)) ?? '';
		const gates = Array.from(declared(lines.filter((line) => line.startsWith('@container')).join('')));
		expect(gates.length).toBe(55);
		for (const [scope, table] of [
			['.se-grid', 'g'],
			['.se-grid-item', 'i'],
		] as const) {
			const resets = base(scope);
			const own = gates.filter((gate) => gate.startsWith(`--${sheet.id}-${table}`));
			expect(own.length).toBeGreaterThan(0);
			for (const gate of own) expect(resets).toContain(`${gate}initial;`);
		}
	});

	test('a media theme resets no gate, since every grid shares the viewport', () => {
		expect(css(ramped)).not.toMatch(/-[gi]\d+(?:sm|md|lg|xl|2xl):initial/);
	});

	test('the container rule is scoped to the theme and declares the named inline-size container', () => {
		const sheet = layout({ query: 'container' });
		expect(sheet.css).toContain(
			`.se-grid-container[data-se-theme="${sheet.id}"]{display:block;width:100%;min-width:0;container-type:inline-size;container-name:se-grid;}`,
		);
		expect(sheet.css.match(/container-type/g)).toHaveLength(1);
	});

	test('the two modes are different themes with different stylesheets', () => {
		expect(layout({ query: 'container' }).id).not.toBe(layout().id);
		expect(layout({ query: 'container' }).css).not.toBe(layout().css);
		expect(layout({ query: 'container' }).id).toBe(layout({ query: 'container' }).id);
	});

	test('rejects a query mode that is neither', () => {
		expect(() => layout({ query: 'viewport' as unknown as 'media' })).toThrow(/'media' or 'container'/);
	});

	test('keeps the breakpoint validation in container mode', () => {
		expect(() => layout({ query: 'container', breakpoints: { sm: '50rem', md: '700px' } })).toThrow(
			/must preserve cascade order/,
		);
	});

	test('a grid and its items resolve against the one width the query measures', () => {
		const sheet = layout({ query: 'container' });
		const gridInline = { '--se-grid-template': 'repeat(1, 1fr)', '--se-grid-template-md': 'repeat(2, 1fr)' };
		const itemInline = { '--se-item-grid-column': 'span 1', '--se-item-grid-column-md': 'span 2' };
		const grid = (width: number) =>
			computeElement(sheet.css, sheet.id, 'grid', width, { inline: gridInline }).value('grid-template-columns');
		const item = (width: number) =>
			computeElement(sheet.css, sheet.id, 'item', width, { inline: itemInline }).value('grid-column');
		expect([grid(600), item(600)]).toEqual(['repeat(1, 1fr)', 'span 1']);
		expect([grid(800), item(800)]).toEqual(['repeat(2, 1fr)', 'span 2']);
	});
});
