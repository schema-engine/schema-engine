import {
	assertAxisNotReserved,
	compileAppearance,
	getAppearanceCss,
	type AppearanceCompilerOptions,
	type AppearanceOptions,
	type CompiledAppearance,
	type ResolvedAppearanceAxes,
} from '@/lib/appearance';
import {
	canonicalGridTheme,
	getGridThemeCss,
	resolveGridTheme,
	type GridThemeOptions,
	type NormalizedGridTheme,
} from '@/lib/grid-styles';

/** What an author writes: the grid vocabulary and the appearance vocabulary of one theme. */
export interface LayoutThemeOptions<TAppearance extends AppearanceOptions = AppearanceOptions> {
	/** Breakpoint thresholds, gap tokens and the default minimum column width. */
	readonly grid?: GridThemeOptions;
	/** The named axes a document picks values on, over the built-in `size` and `surface`. */
	readonly appearance?: TAppearance;
}

/** Inputs to {@link createLayoutTheme} that come from the domain rather than the author. */
export type LayoutThemeCompilerOptions = AppearanceCompilerOptions;

/**
 * A compiled layout theme: the grid vocabulary and the appearance vocabulary, with one id and one
 * stylesheet.
 *
 * @remarks
 * Produced once by {@link createLayoutTheme}, frozen, and safe to share between consumers: engines
 * built on the same theme carry the same `data-se-theme` and share one stylesheet on a page.
 * A renderer puts `id` on the elements the stylesheet should reach, as `data-se-theme`, and
 * emits `css` for each form it renders: React hoists equal stylesheets to one element, while
 * Radiant inlines an identical copy per form.
 */
export interface LayoutTheme<TAxes extends Record<string, string> = Record<string, string>> {
	/** Identity of the whole theme; the value of `data-se-theme` and the scope of every rule in `css`. */
	readonly id: string;
	/** The resolved grid vocabulary. */
	readonly grid: NormalizedGridTheme;
	/** Appearance axis name to its closed value list, built-in axes first. */
	readonly axes: Readonly<{ [A in keyof TAxes]: readonly TAxes[A][] }>;
	/** The stylesheet for grid and appearance together, scoped by `[data-se-theme="<id>"]`. */
	readonly css: string;
}

/** What an engine accepts as its `layout` option: a compiled theme, or options to compile one. */
export type LayoutInput = LayoutTheme | LayoutThemeOptions;

/**
 * Axis-to-value-union map a layout input gives an engine, for typed authoring.
 *
 * @remarks A compiled theme carries its axes; inline options give the built-in axes extended by `appearance`.
 */
export type LayoutAxes<TLayout> = TLayout extends { readonly axes: infer TAxes }
	? { [A in keyof TAxes]: TAxes[A] extends readonly (infer V extends string)[] ? V : never }
	: TLayout extends { readonly appearance: infer TAppearance extends AppearanceOptions }
		? ResolvedAppearanceAxes<TAppearance>
		: ResolvedAppearanceAxes;

/**
 * The brand every compiled theme carries, a non-enumerable property keyed by a registry symbol.
 *
 * @remarks
 * The key comes from `Symbol.for`, so a theme from a second copy of this module (a duplicate
 * install, or a page and a form bundled apart) is still recognised, and a theme keeps its id and
 * axes wherever it is passed. The property is non-enumerable and symbol-keyed, so a spread copy
 * and a structured clone lose it: a copy is not a theme.
 */
const LAYOUT_THEME_BRAND = Symbol.for('@schema-engine/layout/theme');

/**
 * Whether a value is a theme made by {@link createLayoutTheme}, as opposed to options for one.
 *
 * @remarks A copy of a theme is not one: only the object the compiler returned carries the brand.
 */
export function isLayoutTheme(value: unknown): value is LayoutTheme {
	return typeof value === 'object' && value !== null && Reflect.get(value, LAYOUT_THEME_BRAND) === true;
}

/**
 * The one hash behind a theme id: djb2 over the serialized theme, in base 36.
 *
 * @remarks A theme id is only ever minted by {@link createLayoutTheme}.
 */
function hashThemeId(serialized: string): string {
	let hash = 5381;
	for (let index = 0; index < serialized.length; index += 1) {
		hash = ((hash << 5) + hash + serialized.charCodeAt(index)) | 0;
	}
	return `l${(hash >>> 0).toString(36)}`;
}

function canonicalAppearance(appearance: CompiledAppearance) {
	return Object.entries(appearance.axes).map(([axis, values]) => [
		axis,
		values.map((value) => [value, appearance.tokens[axis]?.[value] ?? {}]),
	]);
}

/**
 * Compiles a grid vocabulary and an appearance vocabulary into one frozen theme.
 *
 * @remarks
 * The single construction boundary: one id, one stylesheet, one `data-se-theme` attribute. Options
 * that describe the same theme give the same id, whatever the key order of the grid's responsive
 * entries, so engines built from equal options share a stylesheet.
 *
 * Throws on a grid or appearance option that is invalid, and on an appearance axis named in
 * `reservedNames`: each domain lists the `data-se-*` attributes its renderers already write, so
 * this package hard-codes none.
 */
export function createLayoutTheme<const TAppearance extends AppearanceOptions = Record<never, never>>(
	options?: LayoutThemeOptions<TAppearance>,
	compiler: LayoutThemeCompilerOptions = {},
): LayoutTheme<ResolvedAppearanceAxes<TAppearance>> {
	const grid = resolveGridTheme(options?.grid);
	const appearance = compileAppearance(options?.appearance, compiler);
	const id = hashThemeId(
		JSON.stringify({ grid: canonicalGridTheme(grid), appearance: canonicalAppearance(appearance) }),
	);
	const css = [getGridThemeCss(grid, id), getAppearanceCss(appearance, id)].filter(Boolean).join('\n');
	const theme = { id, grid, axes: appearance.axes, css };
	Object.defineProperty(theme, LAYOUT_THEME_BRAND, { value: true, enumerable: false });
	Object.freeze(theme);
	return theme as unknown as LayoutTheme<ResolvedAppearanceAxes<TAppearance>>;
}

let cachedDefaultLayoutTheme: LayoutTheme<ResolvedAppearanceAxes> | undefined;

/** Frozen library-default theme; shared by engines built without a `layout` option. */
export function getDefaultLayoutTheme(): LayoutTheme<ResolvedAppearanceAxes> {
	cachedDefaultLayoutTheme ??= createLayoutTheme();
	return cachedDefaultLayoutTheme;
}

/**
 * Throws when a compiled theme declares an appearance axis a domain reserves.
 *
 * @remarks
 * {@link createLayoutTheme} checks `reservedNames` as it compiles, but a theme compiled elsewhere
 * (or for another domain) reaches an engine without that check, so the engine runs this on it.
 */
export function assertAxesNotReserved(theme: LayoutTheme, reservedNames: readonly string[]): void {
	const reserved = new Set(reservedNames);
	for (const axis of Object.keys(theme.axes)) assertAxisNotReserved(axis, reserved);
}
