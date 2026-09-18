import type { ElementGridConfig, GridGapToken, GridLayoutConfig } from '@/schemas/base-field';
import { GridGapTokens } from '@/schemas/base-field';

/**
 * Maps authored grid values to theme-scoped CSS variables.
 *
 * @remarks
 * The engine owns the grid vocabulary: breakpoint thresholds, gap tokens,
 * and the default minimum column width. The form owns layout intent:
 * columns, responsive changes, gap selection, field placement.
 *
 * Compile once at the engine boundary ({@link compileGridTheme}); renderers
 * emit the resulting stylesheet and per-form CSS variables inline. Breakpoint
 * behavior lives entirely in the generated media queries — no runtime
 * observers, and layout is correct with JavaScript disabled.
 *
 * Cascade contract for sparse responsive entries (see tests): initialize from
 * top-level values, apply `responsive.default`, then each successive
 * breakpoint. Within an entry, axis-specific gaps (`gapX`/`gapY`) beat the
 * entry's general `gap`.
 *
 * `place-*` shorthands are resolved into their axis longhands here rather than
 * emitted as CSS. A shorthand declaration would have to follow the longhands
 * in the generated rule and would then reset them, so authored `justifyItems`
 * or `justifySelf` could never take effect. Resolving in one place also lets
 * `placeSelf` join the responsive cascade for free.
 *
 * Form-level `rows`, `autoFit`, `autoFill`, and `maxColumnWidth` are accepted
 * by the schema for compatibility but are not emitted to CSS yet.
 *
 * Only authored values are emitted, as custom properties (not camelCase CSS
 * keys) so the return type is a `--*` record assignable to React
 * `CSSProperties` and to inline `style` attributes without a cast. Neutral
 * defaults, the breakpoint cascade, and the resets that stop a nested grid
 * inheriting its parent's placement all live in the generated stylesheet.
 */

const BREAKPOINT_ORDER = ['sm', 'md', 'lg', 'xl', '2xl'] as const;

/** Named breakpoint tokens. Thresholds are configured on the engine. */
export type GridBreakpointToken = (typeof BREAKPOINT_ORDER)[number];

/**
 * Inline style consisting only of CSS custom properties.
 *
 * @remarks
 * React 19 `CSSProperties` indexes `--${string}`; a `string` index does not,
 * which is why earlier `Record<string, string>` returns needed a cast.
 */
export type CssVariables = {
	[property: `--${string}`]: string | undefined;
};

export interface GridThemeOptions {
	/**
	 * Breakpoint thresholds in CSS lengths (`rem` recommended for zoom).
	 * Overrides only the named token; the rest keep library defaults.
	 *
	 * @remarks
	 * Configured thresholds must preserve named cascade order
	 * (`sm ≤ md ≤ lg ≤ xl ≤ 2xl`). `rem`/`em` values are compared at a 16px
	 * root so mixed units cannot invert the sequence.
	 */
	breakpoints?: Partial<Record<GridBreakpointToken, string>>;
	/** Gap token definitions as CSS values, overriding only the named tokens. */
	gap?: Partial<Record<GridGapToken, string>>;
	/** Default minimum column width used by `columns: 'auto'` grids. */
	minColumnWidth?: string;
}

export interface NormalizedGridTheme {
	readonly breakpoints: Readonly<Record<GridBreakpointToken, string>>;
	readonly gap: Readonly<Record<GridGapToken, string>>;
	readonly minColumnWidth: string;
	/** Stable identity of the normalized theme; scopes the generated stylesheet. */
	readonly id: string;
}

/**
 * Immutable engine grid configuration: the resolved theme and its stylesheet.
 *
 * @remarks
 * Produced once by {@link compileGridTheme}. Renderers consume this value;
 * {@link FormEngine.extend} carries the same object unchanged.
 */
export interface CompiledGrid {
	readonly theme: NormalizedGridTheme;
	readonly css: string;
}

const DEFAULT_BREAKPOINTS: Record<GridBreakpointToken, string> = {
	sm: '40rem',
	md: '48rem',
	lg: '64rem',
	xl: '80rem',
	'2xl': '96rem',
};

const DEFAULT_GAP: Record<GridGapToken, string> = {
	none: '0',
	compact: '0.5rem',
	default: 'var(--space-stack, 1rem)',
	loose: 'var(--space-block-lg, 1.5rem)',
	wide: 'var(--space-block-xl, 2rem)',
};

const DEFAULT_MIN_COLUMN_WIDTH = '15.625rem';

/**
 * Public gap tokens. Hosts override these at `:root` to restyle every form.
 *
 * @remarks
 * The engine must never declare these on an element: an element's own
 * declaration beats an inherited one, which would make the documented `:root`
 * override a no-op. The engine's value is declared under
 * {@link gapBaseVariable} instead and reached through a `var()` fallback.
 */
const GAP_TOKEN_VARIABLES: Record<GridGapToken, `--${string}`> = {
	none: '--se-grid-gap-none',
	compact: '--se-grid-gap-compact',
	default: '--se-grid-gap-default',
	loose: '--se-grid-gap-loose',
	wide: '--se-grid-gap-wide',
};

/** Engine default for a gap token, shadowed by the public token when a host sets it. */
function gapBaseVariable(token: GridGapToken): `--${string}` {
	return `--se-grid-gap-base-${token}`;
}

/** A gap token as CSS: the host's override if present, else the engine default. */
function gapTokenValue(token: GridGapToken): string {
	return `var(${GAP_TOKEN_VARIABLES[token]}, var(${gapBaseVariable(token)}))`;
}

const DEFAULT_GAP_CSS = gapTokenValue('default');

/** Root font size used when comparing `rem`/`em` breakpoint thresholds. */
const ROOT_FONT_PX = 16;

type CascadeSlot = 'default' | GridBreakpointToken;
type CssLengthUnit = 'px' | 'rem' | 'em';

/** CSS property, its variable base name, and the value used when unauthored. */
type ResponsiveProperty = readonly [property: string, variable: string, fallback: string];

let cachedDefaultCompiledGrid: CompiledGrid | undefined;

function deepFreeze<T extends object>(value: T): T {
	Object.freeze(value);
	for (const child of Object.values(value)) {
		if (child !== null && typeof child === 'object' && !Object.isFrozen(child)) {
			deepFreeze(child);
		}
	}
	return value;
}

/**
 * Resolves the immutable grid theme from engine options.
 *
 * @remarks
 * Threshold overrides replace only the named breakpoint; the rest keep
 * library defaults. Thresholds accept `px`/`rem`/`em` lengths and must
 * preserve named cascade order. `rem`/`em` compare at a 16px root.
 * Media queries follow viewport width — a form inside a narrow sidebar
 * still receives the desktop rules of the wide screen it lives on.
 */
function resolveGridTheme(options?: GridThemeOptions): NormalizedGridTheme {
	const breakpoints = { ...DEFAULT_BREAKPOINTS, ...options?.breakpoints };
	const gap = { ...DEFAULT_GAP, ...options?.gap };
	const minColumnWidth = options?.minColumnWidth ?? DEFAULT_MIN_COLUMN_WIDTH;
	assertBreakpointOrder(breakpoints);
	return deepFreeze({
		breakpoints,
		gap,
		minColumnWidth,
		id: gridThemeId({ breakpoints, gap, minColumnWidth }),
	});
}

/**
 * Compiles engine grid options into the frozen theme-plus-stylesheet pair.
 *
 * @remarks
 * This is the single construction boundary. Callers that only need the
 * library default should use {@link getDefaultCompiledGrid} so the pair is
 * shared across engines.
 */
export function compileGridTheme(options?: GridThemeOptions): CompiledGrid {
	const theme = resolveGridTheme(options);
	return Object.freeze({ theme, css: getGridThemeCss(theme) });
}

/** Frozen library-default compiled grid; shared by engines built without a `grid` option. */
export function getDefaultCompiledGrid(): CompiledGrid {
	if (!cachedDefaultCompiledGrid) {
		cachedDefaultCompiledGrid = compileGridTheme();
	}
	return cachedDefaultCompiledGrid;
}

/** Frozen library-default theme; shared by engines built without a `grid` option. */
export function getDefaultGridTheme(): NormalizedGridTheme {
	return getDefaultCompiledGrid().theme;
}

function isCssLengthUnit(unit: string | undefined): unit is CssLengthUnit {
	return unit === 'px' || unit === 'rem' || unit === 'em';
}

function thresholdToPx(token: GridBreakpointToken, threshold: string): number {
	const match = /^(\d+(?:\.\d+)?)(px|rem|em)$/.exec(threshold);
	const rawUnit = match?.[2];
	if (!match || !isCssLengthUnit(rawUnit)) {
		throw new Error(`Grid theme breakpoint '${token}' must be a px, rem, or em length; received '${threshold}'.`);
	}
	const value = Number(match[1]);
	return rawUnit === 'px' ? value : value * ROOT_FONT_PX;
}

function assertBreakpointOrder(breakpoints: Record<GridBreakpointToken, string>): void {
	let previousPx = Number.NEGATIVE_INFINITY;
	let previousToken: GridBreakpointToken | undefined;
	for (const token of BREAKPOINT_ORDER) {
		const threshold = breakpoints[token];
		const px = thresholdToPx(token, threshold);
		if (previousToken !== undefined && px < previousPx) {
			throw new Error(
				`Grid theme breakpoints must preserve cascade order sm ≤ md ≤ lg ≤ xl ≤ 2xl (rem/em compared at ${ROOT_FONT_PX}px root); '${token}' (${threshold}) is smaller than '${previousToken}' (${breakpoints[previousToken]}).`,
			);
		}
		previousPx = px;
		previousToken = token;
	}
}

/** Stable theme identity from the normalized options. */
function gridThemeId(theme: Pick<NormalizedGridTheme, 'breakpoints' | 'gap' | 'minColumnWidth'>): string {
	const serialized = JSON.stringify({
		breakpoints: theme.breakpoints,
		gap: theme.gap,
		minColumnWidth: theme.minColumnWidth,
	});
	let hash = 5381;
	for (let index = 0; index < serialized.length; index += 1) {
		hash = ((hash << 5) + hash + serialized.charCodeAt(index)) | 0;
	}
	return `g${(hash >>> 0).toString(36)}`;
}

/**
 * Grid container properties that change per breakpoint.
 *
 * @remarks
 * One table drives the base rule, every media query, and the inheritance
 * resets, so a property cannot be declared at one width and forgotten at
 * another.
 */
const GRID_PROPERTIES: readonly ResponsiveProperty[] = [
	['grid-template-columns', 'se-grid-template', 'repeat(1, minmax(0, 1fr))'],
	['row-gap', 'se-grid-gap-y', DEFAULT_GAP_CSS],
	['column-gap', 'se-grid-gap-x', DEFAULT_GAP_CSS],
];

/**
 * Field placement properties that change per breakpoint.
 *
 * @remarks
 * `justify-self`/`align-self` fall back to `auto`, which defers to the grid's
 * own `justify-items`/`align-items`. Any other fallback would silently beat
 * form-level alignment on every field.
 */
const FIELD_PROPERTIES: readonly ResponsiveProperty[] = [
	['display', 'se-field-display', 'block'],
	['grid-column', 'se-field-grid-column', 'auto'],
	['grid-row', 'se-field-grid-row', 'auto'],
	['justify-self', 'se-field-justify-self', 'auto'],
	['align-self', 'se-field-align-self', 'auto'],
];

/** Grid alignment, authored once for all widths. */
const GRID_ALIGNMENT_PROPERTIES: readonly ResponsiveProperty[] = [
	['justify-items', 'se-grid-justify-items', 'normal'],
	['align-items', 'se-grid-align-items', 'normal'],
	['justify-content', 'se-grid-justify-content', 'normal'],
	['align-content', 'se-grid-align-content', 'start'],
];

/**
 * `var(--x-md, var(--x-sm, var(--x, fallback)))`.
 *
 * @remarks
 * Walking narrower slots in the fallback chain is what lets a renderer emit
 * only the breakpoints an author actually wrote: an unset slot resolves to the
 * nearest narrower one, so the cascade lives in the stylesheet instead of
 * being pre-expanded into every element's inline style.
 */
function cascadingVar(variable: string, fallback: string, breakpoint?: GridBreakpointToken): string {
	const narrower = breakpoint ? BREAKPOINT_ORDER.slice(0, BREAKPOINT_ORDER.indexOf(breakpoint) + 1) : [];
	let value = `var(--${variable}, ${fallback})`;
	for (const slot of narrower) {
		value = `var(--${variable}-${slot}, ${value})`;
	}
	return value;
}

function declarations(properties: readonly ResponsiveProperty[], breakpoint?: GridBreakpointToken): string {
	return properties
		.map(([property, variable, fallback]) => `${property}:${cascadingVar(variable, fallback, breakpoint)};`)
		.join('');
}

/**
 * Resets every slot so custom properties do not inherit past a host.
 *
 * @remarks
 * Custom properties inherit, so a nested grid or field would otherwise pick up
 * its ancestor's placement. `initial` makes `var()` fall through to the chain
 * above, and an inline value on the same element still wins the cascade.
 */
function inheritanceResets(...tables: readonly (readonly ResponsiveProperty[])[]): string {
	return tables
		.flat()
		.flatMap(([, variable]) => [variable, ...BREAKPOINT_ORDER.map((slot) => `${variable}-${slot}`)])
		.map((name) => `--${name}:initial;`)
		.join('');
}

/**
 * Generates the theme-scoped stylesheet.
 *
 * @remarks
 * Rules are scoped under `[data-se-grid-theme="<id>"]`, which the renderer
 * places on every form grid container, so two engines with different themes
 * cannot overwrite each other. Field rules are scoped under the grid that
 * carries the theme attribute on each field host so nested grids do not leak
 * styles across themes.
 */
function getGridThemeCss(theme: NormalizedGridTheme): string {
	const scope = `[data-se-grid-theme="${theme.id}"]`;
	const gridScope = `.se-form-grid${scope}`;
	const fieldScope = `.se-form-field${scope}`;
	const tokens = GridGapTokens.map((token) => `${gapBaseVariable(token)}:${theme.gap[token]};`).join('');
	const lines: string[] = [
		`${scope}{${tokens}}`,
		`${gridScope}{${inheritanceResets(GRID_PROPERTIES, GRID_ALIGNMENT_PROPERTIES)}display:grid;${declarations(GRID_PROPERTIES)}${declarations(GRID_ALIGNMENT_PROPERTIES)}}`,
		`${fieldScope}{${inheritanceResets(FIELD_PROPERTIES)}${declarations(FIELD_PROPERTIES)}}`,
	];
	for (const breakpoint of BREAKPOINT_ORDER) {
		lines.push(
			`@media (min-width:${theme.breakpoints[breakpoint]}){` +
				`${gridScope}{${declarations(GRID_PROPERTIES, breakpoint)}}` +
				`${fieldScope}{${declarations(FIELD_PROPERTIES, breakpoint)}}` +
				`}`,
		);
	}
	return lines.join('\n');
}

function isGridGapToken(value: string): value is GridGapToken {
	for (const token of GridGapTokens) {
		if (token === value) return true;
	}
	return false;
}

/**
 * Maps an authored gap value (semantic token or raw CSS value) to its
 * variable reference or literal.
 */
function resolveGridGap(value: string | undefined): string | undefined {
	if (value === undefined) return undefined;
	if (isGridGapToken(value)) {
		return gapTokenValue(value);
	}
	return value;
}

/** Keywords that qualify the position keyword that follows them. */
const AXIS_QUALIFIERS = new Set(['safe', 'unsafe', 'first', 'last']);

/**
 * Splits a `place-*` shorthand into `[align, justify]` per the CSS grammar.
 *
 * @remarks
 * The shorthand is align-first and a single axis value sets both axes — but an
 * axis value can be two keywords, an overflow position (`safe`/`unsafe`) or a
 * baseline modifier (`first`/`last`) plus its position. So `safe center` is one
 * value for both axes, while `center start` is one value per axis. Splitting on
 * whitespace alone would emit `align-self: safe`, which is not valid CSS.
 */
function splitPlaceShorthand(value: string | undefined): [string | undefined, string | undefined] {
	if (value === undefined) return [undefined, undefined];
	const tokens = value.trim().split(/\s+/).filter(Boolean);
	if (tokens.length === 0) return [undefined, undefined];
	const alignLength = AXIS_QUALIFIERS.has(tokens[0] as string) && tokens.length > 1 ? 2 : 1;
	const align = tokens.slice(0, alignLength).join(' ');
	const justify = alignLength < tokens.length ? tokens.slice(alignLength).join(' ') : align;
	return [align, justify];
}

function toGridTemplate(columns: number | 'auto', minColumnWidth: string): string {
	if (columns === 'auto') {
		return `repeat(auto-fit, minmax(min(${minColumnWidth}, 100%), 1fr))`;
	}
	return `repeat(${columns}, minmax(0, 1fr))`;
}

function customProperty(name: string, slot: CascadeSlot): `--${string}` {
	return slot === 'default' ? `--${name}` : `--${name}-${slot}`;
}

/** Layout values a single cascade slot may set; the top-level config is the `default` slot. */
interface FormGridEntry {
	columns?: number | 'auto';
	minColumnWidth?: string;
	gap?: string;
	gapX?: string;
	gapY?: string;
}

interface ResolvedFormGrid {
	columns: number | 'auto';
	minColumnWidth: string;
	gapX: string;
	gapY: string;
}

/** Which variables a slot has to emit. Untouched ones fall through to the stylesheet. */
interface FormGridTouch {
	template: boolean;
	gapX: boolean;
	gapY: boolean;
}

function applyFormEntry(resolved: ResolvedFormGrid, touch: FormGridTouch, entry: FormGridEntry | undefined): void {
	if (!entry) return;
	if (entry.columns !== undefined) {
		resolved.columns = entry.columns;
		touch.template = true;
	}
	if (entry.minColumnWidth !== undefined) {
		resolved.minColumnWidth = entry.minColumnWidth;
		touch.template = true;
	}
	const entryGap = resolveGridGap(entry.gap);
	const gapX = resolveGridGap(entry.gapX) ?? entryGap;
	const gapY = resolveGridGap(entry.gapY) ?? entryGap;
	if (gapX !== undefined) {
		resolved.gapX = gapX;
		touch.gapX = true;
	}
	if (gapY !== undefined) {
		resolved.gapY = gapY;
		touch.gapY = true;
	}
}

function emitFormSlot(
	variables: CssVariables,
	resolved: ResolvedFormGrid,
	slot: CascadeSlot,
	touch: FormGridTouch,
): void {
	if (touch.template) {
		variables[customProperty('se-grid-template', slot)] = toGridTemplate(resolved.columns, resolved.minColumnWidth);
	}
	if (touch.gapY) variables[customProperty('se-grid-gap-y', slot)] = resolved.gapY;
	if (touch.gapX) variables[customProperty('se-grid-gap-x', slot)] = resolved.gapX;
}

/**
 * Resolves a form grid against the engine theme into one inline style record.
 *
 * @remarks
 * Walks the cascade forward: top-level values, then `responsive.default`, then
 * each named breakpoint. Only slots the author actually wrote are emitted —
 * the generated media queries fall back through narrower slots, so an
 * unconfigured grid carries no inline style at all. Axis properties win over
 * the matching `placeItems`/`placeContent` shorthand.
 */
export function getFormGridVariables(grid: GridLayoutConfig | undefined, theme: NormalizedGridTheme): CssVariables {
	const resolved: ResolvedFormGrid = {
		columns: 1,
		minColumnWidth: theme.minColumnWidth,
		gapX: DEFAULT_GAP_CSS,
		gapY: DEFAULT_GAP_CSS,
	};
	const variables: CssVariables = {};

	const [placeAlignItems, placeJustifyItems] = splitPlaceShorthand(grid?.placeItems);
	const [placeAlignContent, placeJustifyContent] = splitPlaceShorthand(grid?.placeContent);
	const alignment: Record<string, string | undefined> = {
		'--se-grid-justify-items': grid?.justifyItems ?? placeJustifyItems,
		'--se-grid-align-items': grid?.alignItems ?? placeAlignItems,
		'--se-grid-justify-content': grid?.justifyContent ?? placeJustifyContent,
		'--se-grid-align-content': grid?.alignContent ?? placeAlignContent,
	};
	for (const [name, value] of Object.entries(alignment)) {
		if (value !== undefined) variables[name as `--${string}`] = value;
	}

	const responsive = grid?.responsive;
	const touch: FormGridTouch = { template: false, gapX: false, gapY: false };
	applyFormEntry(resolved, touch, grid);
	applyFormEntry(resolved, touch, responsive?.default);
	emitFormSlot(variables, resolved, 'default', touch);

	for (const breakpoint of BREAKPOINT_ORDER) {
		const breakpointTouch: FormGridTouch = { template: false, gapX: false, gapY: false };
		applyFormEntry(resolved, breakpointTouch, responsive?.[breakpoint]);
		emitFormSlot(variables, resolved, breakpoint, breakpointTouch);
	}
	return variables;
}

function formatGridLine(value: number | string): string {
	return typeof value === 'number' ? String(value) : value;
}

/** Placement a single cascade slot may set; the top-level config is the `default` slot. */
interface FieldGridEntry {
	column?: number | string;
	row?: number | string;
	justifySelf?: string;
	alignSelf?: string;
	hidden?: boolean;
}

interface ResolvedFieldGrid {
	column: string;
	row: string;
	justifySelf: string;
	alignSelf: string;
	display: string;
}

interface FieldGridTouch {
	column: boolean;
	row: boolean;
	justifySelf: boolean;
	alignSelf: boolean;
	display: boolean;
}

function newFieldTouch(): FieldGridTouch {
	return { column: false, row: false, justifySelf: false, alignSelf: false, display: false };
}

function applyFieldEntry(resolved: ResolvedFieldGrid, touch: FieldGridTouch, entry: FieldGridEntry | undefined): void {
	if (!entry) return;
	if (entry.column !== undefined) {
		resolved.column = formatGridLine(entry.column);
		touch.column = true;
	}
	if (entry.row !== undefined) {
		resolved.row = formatGridLine(entry.row);
		touch.row = true;
	}
	if (entry.justifySelf !== undefined) {
		resolved.justifySelf = entry.justifySelf;
		touch.justifySelf = true;
	}
	if (entry.alignSelf !== undefined) {
		resolved.alignSelf = entry.alignSelf;
		touch.alignSelf = true;
	}
	if (entry.hidden !== undefined) {
		resolved.display = entry.hidden ? 'none' : 'block';
		touch.display = true;
	}
}

function emitFieldSlot(
	variables: CssVariables,
	resolved: ResolvedFieldGrid,
	slot: CascadeSlot,
	touch: FieldGridTouch,
): void {
	if (touch.column) variables[customProperty('se-field-grid-column', slot)] = resolved.column;
	if (touch.row) variables[customProperty('se-field-grid-row', slot)] = resolved.row;
	if (touch.justifySelf) variables[customProperty('se-field-justify-self', slot)] = resolved.justifySelf;
	if (touch.alignSelf) variables[customProperty('se-field-align-self', slot)] = resolved.alignSelf;
	if (touch.display) variables[customProperty('se-field-display', slot)] = resolved.display;
}

/**
 * Resolves a single element's grid placement into inline style variables.
 *
 * @remarks
 * Same forward cascade and sparse emission as form grids: an element without a
 * `grid` config produces no inline style, and the stylesheet supplies neutral
 * defaults plus the inheritance resets that keep nested fields isolated.
 * `placeSelf` is applied before the axis properties, so those win.
 */
export function getFieldGridVariables(grid?: ElementGridConfig): CssVariables {
	const resolved: ResolvedFieldGrid = {
		column: 'auto',
		row: 'auto',
		justifySelf: 'auto',
		alignSelf: 'auto',
		display: 'block',
	};
	const variables: CssVariables = {};

	const [placeAlignSelf, placeJustifySelf] = splitPlaceShorthand(grid?.placeSelf);
	const touch = newFieldTouch();
	applyFieldEntry(resolved, touch, { justifySelf: placeJustifySelf, alignSelf: placeAlignSelf });
	applyFieldEntry(resolved, touch, grid);
	applyFieldEntry(resolved, touch, grid?.responsive?.default);
	emitFieldSlot(variables, resolved, 'default', touch);

	for (const breakpoint of BREAKPOINT_ORDER) {
		const breakpointTouch = newFieldTouch();
		applyFieldEntry(resolved, breakpointTouch, grid?.responsive?.[breakpoint]);
		emitFieldSlot(variables, resolved, breakpoint, breakpointTouch);
	}
	return variables;
}
