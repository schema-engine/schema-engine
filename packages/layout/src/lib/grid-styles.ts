import type { ElementGridConfig, GridGapToken, GridLayoutConfig, GridOffsetName, GridWidthName } from '@/schemas/grid';
import type { DeepReadonly } from '@/lib/deep-readonly';
import { GridGapTokens } from '@/schemas/grid';
import {
	areasTemplateValue,
	BREAKPOINT_ORDER,
	carryNamedPlacement,
	CASCADE_SLOTS,
	gridAreaTemplates,
	usesGridWidths,
	WIDTH_SPANS,
	WIDTH_TRACKS,
	type CascadeSlot,
	type GridBreakpointToken,
	type NamedPlacement,
} from '@/lib/grid-placement';

/**
 * Maps authored grid values to theme-scoped CSS variables.
 *
 * @remarks
 * The theme owns the grid vocabulary: breakpoint thresholds, gap tokens,
 * and the default minimum column width. The document owns layout intent:
 * columns, responsive changes, gap selection, item placement.
 *
 * Compile once, with the rest of the layout theme ({@link createLayoutTheme}); renderers
 * emit the resulting stylesheet and per-container CSS variables inline. Breakpoint
 * behavior lives entirely in generated media or container queries — no runtime
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
 * Only authored values are emitted, as custom properties (not camelCase CSS
 * keys) so the return type is a `--*` record assignable to React
 * `CSSProperties` and to inline `style` attributes without a cast. Neutral
 * defaults, the breakpoint cascade, and the resets that stop a nested grid
 * inheriting its parent's placement all live in the generated stylesheet.
 */

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
	gap?: GridGapScale;
	/** Default minimum column width used by `columns: 'auto'` grids. */
	minColumnWidth?: string;
	/**
	 * Token values that change from a breakpoint up.
	 *
	 * @remarks
	 * Breakpoint-major, like a document's own `responsive`: one entry per width
	 * listing the tokens that change there, rather than one entry per token
	 * listing its widths. Base values stay in `gap`, so there is no `default`
	 * entry here — and no collision between the `default` *token* and a
	 * `default` *slot*.
	 *
	 * Tokens are axis-agnostic: a document picks which token each axis uses via
	 * `gapX`/`gapY`, so a theme never declares an axis.
	 *
	 * ```ts
	 * grid: {
	 *   gap: { default: '1rem', loose: '1.5rem' },
	 *   responsive: {
	 *     md: { default: '1.25rem' },
	 *     lg: { default: '1.5rem', loose: '2rem' },
	 *   },
	 * }
	 * ```
	 */
	responsive?: Partial<Record<GridBreakpointToken, GridGapScale>>;
	/**
	 * What the breakpoints measure: the viewport (`'media'`, the default) or the grid's own available width (`'container'`).
	 *
	 * @remarks
	 * Container mode emits `@container se-grid (min-width: ...)` where media mode emits `@media`, with
	 * the same breakpoint tokens, gap ramps and cascade, so a document reads the same in both. The
	 * rules query the nearest ancestor that carries {@link GRID_CONTAINER_CLASS}, which an element
	 * cannot be for its own children's placement: the renderer wraps each grid in one, and markup you
	 * write wraps each grid itself. A grid with no such ancestor never matches a breakpoint and keeps
	 * its base layout.
	 *
	 * The theme decides how breakpoints are queried and the document says what changes at each, so a
	 * document is unchanged by where it is mounted. In a container query `em` resolves against the
	 * container's font size.
	 */
	query?: GridQueryMode;
}

/** How a theme's breakpoints are queried; see {@link GridThemeOptions.query}. */
export type GridQueryMode = 'media' | 'container';

/** Gap token values at one width. Unlisted tokens keep the value from the next narrower width. */
export type GridGapScale = Partial<Record<GridGapToken, string>>;

export interface NormalizedGridTheme {
	readonly breakpoints: Readonly<Record<GridBreakpointToken, string>>;
	readonly gap: Readonly<Record<GridGapToken, string>>;
	/** Token overrides per breakpoint; only the tokens a width changes. */
	readonly responsive: Readonly<Partial<Record<GridBreakpointToken, Readonly<GridGapScale>>>>;
	readonly minColumnWidth: string;
	readonly query: GridQueryMode;
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
 * Public gap tokens. Hosts override these at `:root` to restyle every grid.
 *
 * @remarks
 * The theme must never declare these on an element: an element's own
 * declaration beats an inherited one, which would make the documented `:root`
 * override a no-op. The theme's value is declared under
 * {@link gapBaseVariable} instead and reached through a `var()` fallback.
 *
 * A host override therefore replaces the token at *every* width, including one
 * a theme ramps through `responsive` — the public token is the first `var()`
 * argument and a ramp only ever redeclares the fallback. A host that wants its
 * own rhythm declares its own media queries.
 */
const GAP_TOKEN_VARIABLES: Record<GridGapToken, `--${string}`> = {
	none: '--se-grid-gap-none',
	compact: '--se-grid-gap-compact',
	default: '--se-grid-gap-default',
	loose: '--se-grid-gap-loose',
	wide: '--se-grid-gap-wide',
};

/** Theme default for a gap token, shadowed by the public token when a host sets it. */
function gapBaseVariable(token: GridGapToken): `--${string}` {
	return `--se-grid-gap-base-${token}`;
}

/** A gap token as CSS: the host's override if present, else the theme default. */
function gapTokenValue(token: GridGapToken): string {
	return `var(${GAP_TOKEN_VARIABLES[token]}, var(${gapBaseVariable(token)}))`;
}

const DEFAULT_GAP_CSS = gapTokenValue('default');

/**
 * Variable a host sets on an item to choose the display the item rule applies.
 *
 * @remarks
 * The item rule outranks a component's own `display` (class plus attribute
 * beats a lone class), so a host that needs its own layout sets this variable
 * rather than `display`. Responsive `hidden` then toggles between `none` and
 * that mode instead of forcing `block`. Custom properties inherit, so the grid
 * rule resets it: a fieldset that sets `grid` for itself must not turn the
 * fields of its own grid into grids.
 */
const ITEM_DISPLAY_MODE_VARIABLE = '--se-item-display-mode';

/** Display a visible item falls back to. See {@link ITEM_DISPLAY_MODE_VARIABLE}. */
const ITEM_DISPLAY_MODE = `var(${ITEM_DISPLAY_MODE_VARIABLE}, block)`;

/** Root font size used when comparing `rem`/`em` breakpoint thresholds. */
const ROOT_FONT_PX = 16;

type CssLengthUnit = 'px' | 'rem' | 'em';

/** CSS property, its variable base name, and the value used when unauthored. */
type ResponsiveProperty = readonly [property: string, variable: string, fallback: string];

function deepFreeze<T extends object>(value: T): T {
	Object.freeze(value);
	for (const child of Object.values(value)) {
		if (child !== null && typeof child === 'object' && !Object.isFrozen(child)) {
			deepFreeze(child);
		}
	}
	return value;
}

/** Drops empty entries so an unramped theme normalizes to `{}` and emits nothing extra. */
function resolveResponsiveGap(
	overrides?: Partial<Record<GridBreakpointToken, GridGapScale>>,
): Partial<Record<GridBreakpointToken, GridGapScale>> {
	const resolved: Partial<Record<GridBreakpointToken, GridGapScale>> = {};
	for (const breakpoint of BREAKPOINT_ORDER) {
		const entry = overrides?.[breakpoint];
		const tokens = GridGapTokens.filter((token) => entry?.[token] !== undefined);
		if (tokens.length > 0) {
			resolved[breakpoint] = Object.fromEntries(tokens.map((token) => [token, entry![token]])) as GridGapScale;
		}
	}
	return resolved;
}

/**
 * Resolves the immutable grid theme from the `grid` option of a layout theme.
 *
 * @remarks
 * Threshold overrides replace only the named breakpoint; the rest keep
 * library defaults. Thresholds accept `px`/`rem`/`em` lengths and must
 * preserve named cascade order. `rem`/`em` compare at a 16px root.
 * Media queries (the default `query`) follow viewport width — a grid inside a
 * narrow sidebar still receives the desktop rules of the wide screen it lives
 * on; `query: 'container'` follows the grid's wrapper instead.
 */
export function resolveGridTheme(options?: GridThemeOptions): NormalizedGridTheme {
	const breakpoints = { ...DEFAULT_BREAKPOINTS, ...options?.breakpoints };
	const gap = { ...DEFAULT_GAP, ...options?.gap };
	const responsive = resolveResponsiveGap(options?.responsive);
	const minColumnWidth = options?.minColumnWidth ?? DEFAULT_MIN_COLUMN_WIDTH;
	const query = options?.query ?? 'media';
	assertBreakpointOrder(breakpoints);
	assertQueryMode(query);
	return deepFreeze({
		breakpoints,
		gap,
		responsive,
		minColumnWidth,
		query,
	});
}

function assertQueryMode(query: string): asserts query is GridQueryMode {
	if (query !== 'media' && query !== 'container') {
		throw new Error(`Grid theme query must be 'media' or 'container'; received '${query}'.`);
	}
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

/**
 * Responsive gap overrides as ordered pairs, independent of authored key order.
 *
 * @remarks
 * These come from consumer options, so `{ md, lg }` and `{ lg, md }` describe
 * one theme with different `JSON.stringify` output. Hashing that directly would
 * mint two ids for the same theme and emit its stylesheet twice under different
 * scopes, defeating the sharing of one compiled theme.
 */
function canonicalResponsiveGap(
	responsive: Readonly<Partial<Record<GridBreakpointToken, Readonly<GridGapScale>>>>,
): Array<[string, Array<[string, string]>]> {
	return BREAKPOINT_ORDER.flatMap((breakpoint) => {
		const entry = responsive[breakpoint];
		if (!entry) return [];
		const tokens = GridGapTokens.flatMap((token) => {
			const value = entry[token];
			return value === undefined ? [] : [[token, value] as [string, string]];
		});
		return [[breakpoint, tokens] as [string, Array<[string, string]>]];
	});
}

/**
 * The normalized grid theme in a stable shape, for hashing into a layout theme id.
 *
 * @remarks
 * The default query mode is left out, so a media theme keeps the id it had before the option existed.
 */
export function canonicalGridTheme(theme: NormalizedGridTheme) {
	return {
		breakpoints: theme.breakpoints,
		gap: theme.gap,
		responsive: canonicalResponsiveGap(theme.responsive),
		minColumnWidth: theme.minColumnWidth,
		...(theme.query === 'media' ? {} : { query: theme.query }),
	};
}

/**
 * Class a grid container carries, and the stylesheet's hook for it.
 *
 * @remarks
 * Neutral on purpose: a domain's renderer adds this beside its own class,
 * so a step, a page section and a container of any domain share one set of rules. The stylesheet
 * keys on this class, {@link GRID_ITEM_CLASS} and `[data-se-theme]` only, with no alias for a
 * domain's own class.
 */
export const GRID_CLASS = 'se-grid';

/** Class an element placed in a grid carries, and the stylesheet's hook for it. See {@link GRID_CLASS}. */
export const GRID_ITEM_CLASS = 'se-grid-item';

/**
 * Class of every box that passes its parent grid's column tracks down to a nested grid, and the stylesheet's hook for it.
 *
 * @remarks
 * `grid-template-columns: subgrid` only works on a grid item of the grid whose tracks it takes, so the
 * element with `grid.subgrid`, every box between it and the grid that lays out its children, and that
 * {@link GRID_CLASS} grid itself must all carry this class. A box in the chain that does not (a plain
 * `div`) computes its template to `none` and the children fall back to one column, with nothing reported.
 *
 * A `<fieldset>` can never be a subgrid: the browser lays its content out in an anonymous box that is not
 * a grid item of the grid around it. A `fieldset` that carries this class is therefore `display: contents`,
 * which passes its children up to the box around it and draws no border or padding of its own, so give them
 * to that box. The `legend` of such a fieldset is an ordinary child. The grid of the children gets no tracks of its
 * own, so it takes no {@link GRID_CONTAINER_CLASS} wrapper either: layout containment would make it an
 * independent formatting context, and a subgrid inside one is `none`. Its breakpoints are queried against
 * the container of the grid the chain hangs from.
 */
export const GRID_SUBGRID_CLASS = 'se-subgrid';

/**
 * Class of the element a grid in a `query: 'container'` theme is measured against, and the stylesheet's hook for it.
 *
 * @remarks
 * Put it, with `data-se-theme`, on an element that wraps one grid and fills its parent: the
 * breakpoints then follow that element's width. It must be an ancestor of the grid, because the
 * template of a grid and the placement of its items have to query one box, and an element cannot
 * query its own size. The stylesheet declares it only in container mode, as a block with
 * `container-type: inline-size`. Inline-size containment means it no longer sizes to its content, so
 * it collapses in a shrink-to-fit parent (an inline-block, a flex item without a basis, an `auto` grid
 * track). Wrap each grid, nested grids included, so an inner grid follows its own box.
 */
export const GRID_CONTAINER_CLASS = 'se-grid-container';

/** Name of the container the container-mode rules query, so an unrelated container in between cannot capture them. */
const GRID_CONTAINER_NAME = 'se-grid';

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
	['grid-template-areas', 'se-grid-areas', 'none'],
	['row-gap', 'se-grid-gap-y', DEFAULT_GAP_CSS],
	['column-gap', 'se-grid-gap-x', DEFAULT_GAP_CSS],
];

/**
 * Placement an item takes when it sets none, declared on its grid.
 *
 * @remarks
 * A grid whose items use named widths has 12 tracks, so an item that sets no
 * width would otherwise fall into one of them. The grid declares `1 / -1` here
 * and the item's `grid-column` falls back to it, which keeps the rule in the
 * stylesheet. The grid rule resets it so a nested grid does not inherit its
 * parent's default.
 */
const DEFAULT_COLUMN_VARIABLE = '--se-grid-default-column';

/**
 * Item placement properties that change per breakpoint.
 *
 * @remarks
 * `justify-self`/`align-self` fall back to `auto`, which defers to the grid's
 * own `justify-items`/`align-items`. Any other fallback would silently beat
 * grid-level alignment on every item.
 */
const ITEM_PROPERTIES: readonly ResponsiveProperty[] = [
	['display', 'se-item-display', ITEM_DISPLAY_MODE],
	['grid-column', 'se-item-grid-column', `var(${DEFAULT_COLUMN_VARIABLE}, auto)`],
	['grid-row', 'se-item-grid-row', 'auto'],
	['justify-self', 'se-item-justify-self', 'auto'],
	['align-self', 'se-item-align-self', 'auto'],
	['margin-block-start', 'se-item-margin-block-start', '0'],
	['margin-block-end', 'se-item-margin-block-end', '0'],
];

/** Grid alignment, authored once for all widths. */
const GRID_ALIGNMENT_PROPERTIES: readonly ResponsiveProperty[] = [
	['justify-items', 'se-grid-justify-items', 'normal'],
	['align-items', 'se-grid-align-items', 'normal'],
	['justify-content', 'se-grid-justify-content', 'normal'],
	['align-content', 'se-grid-align-content', 'start'],
];

/** Removes the space after each comma of a stylesheet-only fallback, which `var()` ignores. */
function tight(fallback: string): string {
	return fallback.replaceAll(', ', ',');
}

/**
 * Name of the stylesheet-private custom property that gates one cascade slot of one table row.
 *
 * @remarks
 * A gate is declared inside the slot's media query as a copy of the public slot variable, so
 * outside that query it is the guaranteed-invalid value and the `var()` chain skips it. The names
 * are private to the stylesheet (a form never writes them, and they carry no contract) and carry
 * the theme id: custom properties inherit, so a gate named alike in two themes would let a theme
 * with a wider threshold read the gate its ancestor's narrower query declared. In a media theme
 * every element of a theme shares the viewport, so one that is reached declares its own gates
 * wherever the query applies and needs no reset. A container theme measures each grid against its
 * own container, so a nested grid can sit below a breakpoint its ancestor is above and would read the
 * ancestor's gate: its rules reset every gate ({@link gateResets}).
 *
 * Read a name in devtools as theme id, table (`g` grid, `i` item), the property's row in that
 * table, and the breakpoint token: `--l1abc-i1md` is the `md` gate of the item `grid-column`.
 */
function gateName(themeId: string, table: string, row: number, slot: GridBreakpointToken): string {
	return `--${themeId}-${table}${row}${slot}`;
}

/**
 * `var(--g-2xl, var(--g-xl, ... var(--x, fallback)))`: the widest slot whose media query applies wins.
 *
 * @remarks
 * The chain is written once, in the base rule. A slot's gate is declared only inside its media
 * query (see {@link gateName}), so the cascade across widths costs one short declaration per slot
 * instead of restating the whole chain in every query. An unset slot resolves to the nearest
 * narrower one, so a renderer emits only the breakpoints an author wrote.
 */
function cascadingVar(themeId: string, table: string, row: number, variable: string, fallback: string): string {
	let value = `var(--${variable},${tight(fallback)})`;
	for (const slot of BREAKPOINT_ORDER) {
		value = `var(${gateName(themeId, table, row, slot)},${value})`;
	}
	return value;
}

function declarations(themeId: string, table: string, properties: readonly ResponsiveProperty[]): string {
	return properties
		.map(
			([property, variable, fallback], row) =>
				`${property}:${cascadingVar(themeId, table, row, variable, fallback)};`,
		)
		.join('');
}

/** Alignment is authored once for all widths, so it has no slots and no gates. */
function flatDeclarations(properties: readonly ResponsiveProperty[]): string {
	return properties
		.map(([property, variable, fallback]) => `${property}:var(--${variable},${tight(fallback)});`)
		.join('');
}

/** One slot's gates: each property's public slot variable, copied inside the slot's media query. */
function gates(
	themeId: string,
	table: string,
	properties: readonly ResponsiveProperty[],
	slot: GridBreakpointToken,
): string {
	return properties
		.map(([, variable], row) => `${gateName(themeId, table, row, slot)}:var(--${variable}-${slot});`)
		.join('');
}

/**
 * Resets every slot so custom properties do not inherit past a host.
 *
 * @remarks
 * Custom properties inherit, so a nested grid or item would otherwise pick up
 * its ancestor's placement. `initial` makes `var()` fall through to the chain
 * above, and an inline value on the same element still wins the cascade.
 * Only a table with slots resets them: alignment is authored once for all widths, so its
 * slot variables are never written and never read.
 */
function inheritanceResets(properties: readonly ResponsiveProperty[], withSlots: boolean): string {
	return properties
		.flatMap(([, variable]) => [
			`--${variable}`,
			...(withSlots ? BREAKPOINT_ORDER.map((slot) => `--${variable}-${slot}`) : []),
		])
		.map((name) => `${name}:initial;`)
		.join('');
}

/**
 * Resets every gate of a table, so an element reads only the gates its own container's query declares.
 *
 * @remarks
 * A gate is declared on the element a query matches and inherits from there. Under a container query a
 * nested grid or item sits in a narrower container than its ancestors, so the breakpoint they match
 * can be one it does not, and it would take their resolved values over its own cascade. `initial`
 * returns the gate to the guaranteed-invalid value, which the `var()` chain skips; the element's own
 * matching query block comes later in the sheet at the same specificity and declares it again.
 */
function gateResets(themeId: string, table: string, properties: readonly ResponsiveProperty[]): string {
	return properties
		.flatMap((_, row) => BREAKPOINT_ORDER.map((slot) => `${gateName(themeId, table, row, slot)}:initial;`))
		.join('');
}

/**
 * Generates the theme-scoped stylesheet.
 *
 * @remarks
 * Rules are scoped under `[data-se-theme="<id>"]`, which the renderer
 * places on every grid container and item, so two themes that differ
 * cannot overwrite each other. Item rules are scoped under the item that
 * carries the theme attribute so nested grids do not leak styles across themes.
 * Selectors use only {@link GRID_CLASS}, {@link GRID_ITEM_CLASS} and that attribute.
 *
 * Each responsive property is declared once, in the base rule, as a `var()` chain over the
 * slot gates ({@link gateName}); a media query only declares the gates of its slot.
 * A `query: 'container'` theme changes the at-rule, to `@container se-grid`, adds the rule of
 * {@link GRID_CONTAINER_CLASS} and resets each grid's and item's gates in its base rule
 * ({@link gateResets}); a media theme emits neither.
 *
 * @param theme The resolved grid vocabulary.
 * @param themeId The id of the layout theme the rules are scoped to.
 */
export function getGridThemeCss(theme: NormalizedGridTheme, themeId: string): string {
	const scope = `[data-se-theme="${themeId}"]`;
	const gridScope = `.${GRID_CLASS}${scope}`;
	const itemScope = `.${GRID_ITEM_CLASS}${scope}`;
	const subgridScope = `.${GRID_SUBGRID_CLASS}${scope}`;
	const tokens = GridGapTokens.map((token) => `${gapBaseVariable(token)}:${theme.gap[token]};`).join('');
	const container = theme.query === 'container';
	const atRule = container ? `@container ${GRID_CONTAINER_NAME}` : '@media';
	const lines: string[] = [
		`${scope}{${tokens}}`,
		...(container
			? [
					`.${GRID_CONTAINER_CLASS}${scope}{display:block;width:100%;min-width:0;container-type:inline-size;container-name:${GRID_CONTAINER_NAME};}`,
				]
			: []),
		`${subgridScope}{${ITEM_DISPLAY_MODE_VARIABLE}:grid;display:grid;grid-template-columns:subgrid;column-gap:normal;align-content:start;}`,
		`fieldset${subgridScope}{display:contents;}`,
		`${subgridScope}>:not(.${GRID_ITEM_CLASS}){grid-column:1/-1;}`,
		`${gridScope}{${container ? gateResets(themeId, 'g', GRID_PROPERTIES) : ''}${inheritanceResets(GRID_PROPERTIES, true)}${inheritanceResets(GRID_ALIGNMENT_PROPERTIES, false)}${DEFAULT_COLUMN_VARIABLE}:initial;${ITEM_DISPLAY_MODE_VARIABLE}:initial;display:grid;${declarations(themeId, 'g', GRID_PROPERTIES)}${flatDeclarations(GRID_ALIGNMENT_PROPERTIES)}}`,
		`.${GRID_CLASS}${subgridScope}{--se-grid-template:subgrid;--se-grid-gap-x:normal;${DEFAULT_COLUMN_VARIABLE}:inherit;}`,
		`${itemScope}{${container ? gateResets(themeId, 'i', ITEM_PROPERTIES) : ''}${inheritanceResets(ITEM_PROPERTIES, true)}${declarations(themeId, 'i', ITEM_PROPERTIES)}}`,
	];
	for (const breakpoint of BREAKPOINT_ORDER) {
		const ramped = theme.responsive[breakpoint];
		const rampedTokens = ramped
			? GridGapTokens.filter((token) => ramped[token] !== undefined)
					.map((token) => `${gapBaseVariable(token)}:${ramped[token]};`)
					.join('')
			: '';
		lines.push(
			`${atRule} (min-width:${theme.breakpoints[breakpoint]}){${rampedTokens ? `${scope}{${rampedTokens}}` : ''}${gridScope}{${gates(themeId, 'g', GRID_PROPERTIES, breakpoint)}}${itemScope}{${gates(themeId, 'i', ITEM_PROPERTIES, breakpoint)}}}`,
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
interface GridEntry {
	columns?: number | 'auto';
	minColumnWidth?: string;
	gap?: string;
	gapX?: string;
	gapY?: string;
}

/** Placement a single cascade slot may set; the top-level config is the `default` slot. */
interface GridItemEntry {
	area?: string;
	width?: GridWidthName;
	offset?: GridOffsetName;
	column?: number | string;
	row?: number | string;
	justifySelf?: string;
	alignSelf?: string;
	hidden?: boolean;
	marginBlockStart?: string;
	marginBlockEnd?: string;
}

function emitGapEntry(variables: CssVariables, slot: CascadeSlot, entry: GridEntry | undefined): void {
	if (!entry) return;
	const entryGap = resolveGridGap(entry.gap);
	const gapX = resolveGridGap(entry.gapX) ?? entryGap;
	const gapY = resolveGridGap(entry.gapY) ?? entryGap;
	if (gapY !== undefined) variables[customProperty('se-grid-gap-y', slot)] = gapY;
	if (gapX !== undefined) variables[customProperty('se-grid-gap-x', slot)] = gapX;
}

/**
 * Resolves a grid against the theme into one inline style record.
 *
 * @remarks
 * Only values an author wrote are emitted; the generated stylesheet falls back
 * through the narrower breakpoints, so an unconfigured grid carries no inline
 * style. `columns` and `minColumnWidth` are the one coupled pair — they share a
 * single template — so they are the only values carried across slots. Axis
 * properties win over the matching `placeItems`/`placeContent` shorthand.
 *
 * When `elements` (the items this grid places) use named widths, the grid
 * gets 12 tracks and a `1 / -1` default placement for items that set no width. Validation keeps that from meeting `columns`.
 * The items include the children of every subgrid element, however deep, because a subgrid places
 * them on this grid's tracks; a domain walks its children and passes them in. The grid of a subgrid
 * has no tracks of its own, so its renderer does not call this.
 *
 * A grid with `areas` gets the template of each slot that sets one: the quoted
 * rows as `--se-grid-areas` and the track count they draw as `--se-grid-template`,
 * derived from the rows rather than authored, as with named widths.
 */
export function getGridVariables(
	grid: DeepReadonly<GridLayoutConfig> | undefined,
	theme: NormalizedGridTheme,
	elements: readonly unknown[],
): CssVariables {
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

	let columns: number | 'auto' = 1;
	let minColumnWidth = theme.minColumnWidth;
	const emitTemplate = (slot: CascadeSlot, entry: GridEntry | undefined): void => {
		if (!entry) return;
		if (entry.columns === undefined && entry.minColumnWidth === undefined) return;
		if (entry.columns !== undefined) columns = entry.columns;
		if (entry.minColumnWidth !== undefined) minColumnWidth = entry.minColumnWidth;
		variables[customProperty('se-grid-template', slot)] = toGridTemplate(columns, minColumnWidth);
	};

	if (usesGridWidths(elements)) {
		variables['--se-grid-template'] = `repeat(${WIDTH_TRACKS}, minmax(0, 1fr))`;
		variables[DEFAULT_COLUMN_VARIABLE] = '1 / -1';
	}

	const templates = gridAreaTemplates(grid);
	for (const slot of CASCADE_SLOTS) {
		const rows = templates[slot];
		if (!rows) continue;
		variables[customProperty('se-grid-areas', slot)] = areasTemplateValue(rows);
		variables[customProperty('se-grid-template', slot)] = toGridTemplate(
			rows[0]?.length ?? 1,
			theme.minColumnWidth,
		);
	}

	const responsive = grid?.responsive;
	emitTemplate('default', grid);
	emitTemplate('default', responsive?.default);
	emitGapEntry(variables, 'default', grid);
	emitGapEntry(variables, 'default', responsive?.default);

	for (const breakpoint of BREAKPOINT_ORDER) {
		emitTemplate(breakpoint, responsive?.[breakpoint]);
		emitGapEntry(variables, breakpoint, responsive?.[breakpoint]);
	}
	return variables;
}

/**
 * `grid-column` for a width and offset.
 *
 * @remarks
 * Both names resolve into one declaration, so a slot that authors only one of
 * them is emitted together with the other as the narrower slots left it —
 * the same coupling `columns` and `minColumnWidth` have for the grid template.
 * An offset with no width runs to the end of the row.
 */
function namedColumn({ width, offset }: NamedPlacement): string {
	const start = offset === undefined ? undefined : WIDTH_SPANS[offset] + 1;
	if (width === undefined) return start === undefined ? 'auto' : `${start} / -1`;
	const span = `span ${WIDTH_SPANS[width]}`;
	return start === undefined ? span : `${start} / ${span}`;
}

function formatGridLine(value: number | string): string {
	return typeof value === 'number' ? String(value) : value;
}

function emitItemEntry(
	variables: CssVariables,
	slot: CascadeSlot,
	entry: GridItemEntry | undefined,
	named: NamedPlacement = {},
): void {
	if (!entry) return;
	if (entry.width !== undefined || entry.offset !== undefined) {
		carryNamedPlacement(named, entry);
		variables[customProperty('se-item-grid-column', slot)] = namedColumn(named);
	}
	if (entry.area !== undefined) {
		variables[customProperty('se-item-grid-column', slot)] = entry.area;
		variables[customProperty('se-item-grid-row', slot)] = entry.area;
	}
	if (entry.column !== undefined) {
		variables[customProperty('se-item-grid-column', slot)] = formatGridLine(entry.column);
	}
	if (entry.row !== undefined) variables[customProperty('se-item-grid-row', slot)] = formatGridLine(entry.row);
	if (entry.justifySelf !== undefined) variables[customProperty('se-item-justify-self', slot)] = entry.justifySelf;
	if (entry.alignSelf !== undefined) variables[customProperty('se-item-align-self', slot)] = entry.alignSelf;
	const marginBlockStart = resolveGridGap(entry.marginBlockStart);
	if (marginBlockStart !== undefined) {
		variables[customProperty('se-item-margin-block-start', slot)] = marginBlockStart;
	}
	const marginBlockEnd = resolveGridGap(entry.marginBlockEnd);
	if (marginBlockEnd !== undefined) {
		variables[customProperty('se-item-margin-block-end', slot)] = marginBlockEnd;
	}
	if (entry.hidden !== undefined) {
		variables[customProperty('se-item-display', slot)] = entry.hidden ? 'none' : ITEM_DISPLAY_MODE;
	}
}

/**
 * Resolves a single element's grid placement and spacing into inline style variables.
 *
 * @remarks
 * Each slot emits exactly what its entry authored — no value is carried across
 * breakpoints, because the generated stylesheet already falls back through the
 * narrower slots. The one exception is `width` and `offset`, which share the
 * single `grid-column` declaration (see {@link namedColumn}). An `area` is one
 * name written to both `grid-column` and `grid-row`, where a lone name reads as
 * that area's start and end lines. An element without a `grid` config produces
 * no inline style.
 * `placeSelf` is applied before the axis properties, so those win.
 *
 * `subgrid` makes the element span `1 / -1`, its parent's whole row. It is the only placement a
 * subgrid takes, so validation rejects the other column keys beside it, and the stylesheet does the rest
 * under {@link GRID_SUBGRID_CLASS}.
 *
 * `marginBlockStart`/`marginBlockEnd` accept the same gap tokens as the grid, so
 * a one-off rhythm around a non-input element reads in the same vocabulary as
 * the grid's spacing. They ride the shared item property table rather than a
 * separate mechanism, which is what gives them the breakpoint cascade and the
 * inheritance resets for free — and keeps a single system owning the block axis
 * instead of two fighting over it.
 */
export function getGridItemVariables(grid?: ElementGridConfig): CssVariables {
	const variables: CssVariables = {};
	const [alignSelf, justifySelf] = splitPlaceShorthand(grid?.placeSelf);

	if (grid?.subgrid) variables['--se-item-grid-column'] = '1 / -1';
	const named: NamedPlacement = {};
	emitItemEntry(variables, 'default', { alignSelf, justifySelf });
	emitItemEntry(variables, 'default', grid, named);
	emitItemEntry(variables, 'default', grid?.responsive?.default, named);

	for (const breakpoint of BREAKPOINT_ORDER) {
		emitItemEntry(variables, breakpoint, grid?.responsive?.[breakpoint], named);
	}
	return variables;
}
