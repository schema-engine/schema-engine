import {
	compileAppearance,
	getAppearanceCss,
	type AppearanceCompilerOptions,
	type AppearanceOptions,
	type CompiledAppearance,
	type ResolvedAppearanceAxes,
} from '@/lib/appearance';
import { canonicalGridTheme, getGridThemeCss, resolveGridTheme } from '@/lib/grid-styles';
import type { GridThemeOptions, NormalizedGridTheme } from '@/lib/grid-styles';

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
 * Produced once by {@link createLayoutTheme}, frozen, and safe to share between engines: engines
 * built on the same theme carry the same `data-se-theme` and share one stylesheet on a page.
 * A renderer puts `id` on the elements the stylesheet should reach, as `data-se-theme`, and
 * emits `css` once.
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

const compiledThemes = new WeakSet<object>();

/**
 * Whether a value is a theme made by {@link createLayoutTheme}, as opposed to options for one.
 *
 * @remarks A copy of a theme is not one: only the frozen object the compiler returned is trusted.
 */
export function isLayoutTheme(value: unknown): value is LayoutTheme {
	return typeof value === 'object' && value !== null && compiledThemes.has(value);
}

/**
 * The one hash behind a theme id: djb2 over the serialized theme, in base 36.
 *
 * @remarks Not exported. A theme id is only ever minted by {@link createLayoutTheme}.
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
	const theme = Object.freeze({ id, grid, axes: appearance.axes, css });
	compiledThemes.add(theme);
	return theme as unknown as LayoutTheme<ResolvedAppearanceAxes<TAppearance>>;
}

let cachedDefaultLayoutTheme: LayoutTheme | undefined;

/** Frozen library-default theme; shared by engines built without a `layout` option. */
export function getDefaultLayoutTheme(): LayoutTheme<ResolvedAppearanceAxes> {
	cachedDefaultLayoutTheme ??= createLayoutTheme();
	return cachedDefaultLayoutTheme as LayoutTheme<ResolvedAppearanceAxes>;
}

/**
 * Throws when a compiled theme declares an appearance axis a domain reserves.
 *
 * @remarks
 * {@link createLayoutTheme} checks `reservedNames` as it compiles, but a theme compiled elsewhere
 * (or for another domain) reaches an engine without that check, so the engine runs this on it.
 */
export function assertAxesNotReserved(theme: LayoutTheme, reservedNames: readonly string[]): void {
	for (const axis of Object.keys(theme.axes)) {
		if (reservedNames.includes(axis)) {
			throw new Error(`Invalid appearance axis name '${axis}': data-se-${axis} is reserved by the renderer.`);
		}
	}
}
