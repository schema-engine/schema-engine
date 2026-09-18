import type {
	ElementGridConfig,
	FieldGridBreakpointConfig,
	GridBreakpointConfig,
	GridGapToken,
	GridGapValue,
	GridLayoutConfig,
} from '@/schemas/base-field';
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
 * Form-level `rows`, `autoFit`, `autoFill`, and `maxColumnWidth` are accepted
 * by the schema for compatibility but are not emitted to CSS yet.
 *
 * Alignment is emitted as custom properties (not camelCase CSS keys) so the
 * return type is a `--*` record assignable to React `CSSProperties` and to
 * inline `style` attributes without a cast. Unauthored alignment is fully
 * resolved so nested grids do not inherit a parent's variables.
 */

const BREAKPOINT_ORDER = ['sm', 'md', 'lg', 'xl', '2xl'] as const;

/** Named breakpoint tokens. Thresholds are configured on the engine. */
export type GridBreakpointToken = (typeof BREAKPOINT_ORDER)[number];

export type { GridGapToken };
export const GRID_GAP_TOKENS = GridGapTokens;

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

const GAP_TOKEN_VARIABLES: Record<GridGapToken, `--${string}`> = {
	none: '--se-grid-gap-none',
	compact: '--se-grid-gap-compact',
	default: '--se-grid-gap-default',
	loose: '--se-grid-gap-loose',
	wide: '--se-grid-gap-wide',
};

const DEFAULT_GAP_CSS = `var(${GAP_TOKEN_VARIABLES.default})`;

/** Root font size used when comparing `rem`/`em` breakpoint thresholds. */
const ROOT_FONT_PX = 16;

type CascadeSlot = 'default' | GridBreakpointToken;
type CssLengthUnit = 'px' | 'rem' | 'em';

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
export function resolveGridTheme(options?: GridThemeOptions): NormalizedGridTheme {
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
export function gridThemeId(theme: Pick<NormalizedGridTheme, 'breakpoints' | 'gap' | 'minColumnWidth'>): string {
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
 * Generates the theme-scoped stylesheet.
 *
 * @remarks
 * Rules are scoped under `[data-se-grid-theme="<id>"]`, which the renderer
 * places on every form grid container, so two engines with different themes
 * cannot overwrite each other. Field rules are scoped under the grid that
 * carries the theme attribute on each field host so nested grids do not leak
 * styles across themes.
 */
export function getGridThemeCss(theme: NormalizedGridTheme): string {
	const scope = `[data-se-grid-theme="${theme.id}"]`;
	const gridScope = `.se-form-grid${scope}`;
	const fieldScope = `.se-form-field${scope}`;
	const tokens = GRID_GAP_TOKENS.map((token) => `${GAP_TOKEN_VARIABLES[token]}:${theme.gap[token]}`).join(';');
	const lines: string[] = [
		`${scope}{${tokens};--se-grid-min-column-width:${theme.minColumnWidth};}`,
		`${gridScope}{display:grid;grid-template-columns:var(--se-grid-template, repeat(1, minmax(0, 1fr)));row-gap:var(--se-grid-gap-y, var(--se-grid-gap-default));column-gap:var(--se-grid-gap-x, var(--se-grid-gap-default));justify-items:var(--se-grid-justify-items);align-items:var(--se-grid-align-items);justify-content:var(--se-grid-justify-content);align-content:var(--se-grid-align-content);place-items:var(--se-grid-place-items);place-content:var(--se-grid-place-content);}`,
		`${fieldScope}{display:var(--se-field-display, block);grid-column:var(--se-field-grid-column, auto);grid-row:var(--se-field-grid-row, auto);justify-self:var(--se-field-justify-self, stretch);align-self:var(--se-field-align-self, stretch);place-self:var(--se-field-place-self);}`,
	];
	for (const breakpoint of BREAKPOINT_ORDER) {
		lines.push(
			`@media (min-width:${theme.breakpoints[breakpoint]}){` +
				`${gridScope}{grid-template-columns:var(--se-grid-template-${breakpoint}, var(--se-grid-template, repeat(1, minmax(0, 1fr))));row-gap:var(--se-grid-gap-y-${breakpoint}, var(--se-grid-gap-y, var(--se-grid-gap-default)));column-gap:var(--se-grid-gap-x-${breakpoint}, var(--se-grid-gap-x, var(--se-grid-gap-default)));}` +
				`${fieldScope}{display:var(--se-field-display-${breakpoint}, var(--se-field-display, block));grid-column:var(--se-field-grid-column-${breakpoint}, var(--se-field-grid-column, auto));grid-row:var(--se-field-grid-row-${breakpoint}, var(--se-field-grid-row, auto));justify-self:var(--se-field-justify-self-${breakpoint}, var(--se-field-justify-self, stretch));align-self:var(--se-field-align-self-${breakpoint}, var(--se-field-align-self, stretch));}` +
				`}`,
		);
	}
	return lines.join('\n');
}

function isGridGapToken(value: string): value is GridGapToken {
	for (const token of GRID_GAP_TOKENS) {
		if (token === value) return true;
	}
	return false;
}

/**
 * Maps an authored gap value (semantic token or raw CSS value) to its
 * variable reference or literal.
 */
export function resolveGridGap(value: GridGapValue | undefined): string | undefined {
	if (value === undefined) return undefined;
	if (isGridGapToken(value)) {
		return `var(${GAP_TOKEN_VARIABLES[value]})`;
	}
	return value;
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

interface ResolvedFormGrid {
	columns: number | 'auto';
	minColumnWidth: string;
	gapX: string;
	gapY: string;
}

function applyFormEntry(resolved: ResolvedFormGrid, entry: GridBreakpointConfig | undefined): void {
	if (!entry) return;
	if (entry.columns !== undefined) resolved.columns = entry.columns;
	if (entry.minColumnWidth !== undefined) resolved.minColumnWidth = entry.minColumnWidth;
	const entryGap = resolveGridGap(entry.gap);
	const gapX = resolveGridGap(entry.gapX) ?? entryGap;
	const gapY = resolveGridGap(entry.gapY) ?? entryGap;
	if (gapX !== undefined) resolved.gapX = gapX;
	if (gapY !== undefined) resolved.gapY = gapY;
}

function emitFormSlot(variables: CssVariables, resolved: ResolvedFormGrid, slot: CascadeSlot): void {
	variables[customProperty('se-grid-template', slot)] = toGridTemplate(resolved.columns, resolved.minColumnWidth);
	variables[customProperty('se-grid-gap-y', slot)] = resolved.gapY;
	variables[customProperty('se-grid-gap-x', slot)] = resolved.gapX;
}

/**
 * Resolves a form grid against the engine theme into one inline style record.
 *
 * @remarks
 * Walks the cascade forward: top-level values, then `responsive.default`, then
 * each named breakpoint. Every slot is emitted fully resolved so generated
 * media queries read single variables and nested grids stay isolated.
 */
export function getFormGridVariables(grid: GridLayoutConfig | undefined, theme: NormalizedGridTheme): CssVariables {
	const resolved: ResolvedFormGrid = {
		columns: grid?.columns ?? 1,
		minColumnWidth: grid?.minColumnWidth ?? theme.minColumnWidth,
		gapX: resolveGridGap(grid?.gapX ?? grid?.gap) ?? DEFAULT_GAP_CSS,
		gapY: resolveGridGap(grid?.gapY ?? grid?.gap) ?? DEFAULT_GAP_CSS,
	};

	const responsive = grid?.responsive;
	applyFormEntry(resolved, responsive?.default);

	const variables: CssVariables = {
		'--se-grid-justify-items': grid?.justifyItems ?? 'initial',
		'--se-grid-align-items': grid?.alignItems ?? 'initial',
		'--se-grid-justify-content': grid?.justifyContent ?? 'initial',
		'--se-grid-align-content': grid?.alignContent ?? 'start',
		'--se-grid-place-items': grid?.placeItems ?? 'initial',
		'--se-grid-place-content': grid?.placeContent ?? 'initial',
	};
	emitFormSlot(variables, resolved, 'default');
	if (resolved.columns === 'auto') {
		variables['--se-grid-min-column-width'] = resolved.minColumnWidth;
	}
	for (const breakpoint of BREAKPOINT_ORDER) {
		applyFormEntry(resolved, responsive?.[breakpoint]);
		emitFormSlot(variables, resolved, breakpoint);
	}
	return variables;
}

function formatGridLine(value: number | string): string {
	return typeof value === 'number' ? String(value) : value;
}

function fieldDisplay(hidden: boolean): string {
	return hidden ? 'none' : 'block';
}

interface ResolvedFieldGrid {
	column: string;
	row: string;
	justifySelf: string;
	alignSelf: string;
	hidden: boolean;
}

function applyFieldEntry(resolved: ResolvedFieldGrid, entry: FieldGridBreakpointConfig | undefined): void {
	if (!entry) return;
	if (entry.column !== undefined) resolved.column = formatGridLine(entry.column);
	if (entry.row !== undefined) resolved.row = formatGridLine(entry.row);
	if (entry.justifySelf !== undefined) resolved.justifySelf = entry.justifySelf;
	if (entry.alignSelf !== undefined) resolved.alignSelf = entry.alignSelf;
	if (entry.hidden !== undefined) resolved.hidden = entry.hidden;
}

function emitFieldSlot(variables: CssVariables, resolved: ResolvedFieldGrid, slot: CascadeSlot): void {
	variables[customProperty('se-field-grid-column', slot)] = resolved.column;
	variables[customProperty('se-field-grid-row', slot)] = resolved.row;
	variables[customProperty('se-field-justify-self', slot)] = resolved.justifySelf;
	variables[customProperty('se-field-align-self', slot)] = resolved.alignSelf;
	variables[customProperty('se-field-display', slot)] = fieldDisplay(resolved.hidden);
}

/**
 * Resolves a single element's grid placement into inline style variables.
 *
 * @remarks
 * Same forward cascade as form grids. Neutral defaults are emitted when unset
 * so nested fields never inherit a parent field's custom properties.
 */
export function getFieldGridVariables(grid?: ElementGridConfig): CssVariables {
	const authored = grid ?? {};
	const resolved: ResolvedFieldGrid = {
		column: authored.column !== undefined ? formatGridLine(authored.column) : 'auto',
		row: authored.row !== undefined ? formatGridLine(authored.row) : 'auto',
		justifySelf: authored.justifySelf ?? 'stretch',
		alignSelf: authored.alignSelf ?? 'stretch',
		hidden: false,
	};
	const responsive = authored.responsive;
	applyFieldEntry(resolved, responsive?.default);

	const variables: CssVariables = {
		'--se-field-place-self': authored.placeSelf ?? 'auto',
	};
	emitFieldSlot(variables, resolved, 'default');
	for (const breakpoint of BREAKPOINT_ORDER) {
		applyFieldEntry(resolved, responsive?.[breakpoint]);
		emitFieldSlot(variables, resolved, breakpoint);
	}
	return variables;
}

/** `data-se-grid-theme` on the field host; must match the owning grid container's theme id. */
export const GRID_THEME_DATA_ATTRIBUTE = 'data-se-grid-theme';

export interface FieldGridHost {
	readonly themeId: string;
	readonly style: CssVariables;
}

/**
 * Grid placement styles and theme ownership for a field host element.
 *
 * @remarks
 * Field rules in {@link getGridThemeCss} match `.se-form-field[data-se-grid-theme]`
 * so outer themes cannot style fields owned by a nested grid. Callers set
 * `data-se-grid-theme={host.themeId}`.
 */
export function getFieldGridHostProps(themeId: string, grid?: ElementGridConfig): FieldGridHost {
	return {
		themeId,
		style: getFieldGridVariables(grid),
	};
}
