import {
	getDefaultLayoutTheme,
	getGridItemVariables,
	getGridVariables,
	type CssVariables,
	type ElementGridConfig,
} from '@schema-engine/layout';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';

type HostStyle = Record<string, string | number | undefined>;

/**
 * Grid placement variables plus the owning theme id for a field host element.
 *
 * @remarks
 * Single theme-id resolver for the Radiant renderer: an explicit id from the
 * renderer, else the engine rendering this field, else the library default for
 * hosts rendered outside any engine. Callers set
 * `data-se-theme={themeId}` so the engine's generated field rules match.
 */
export function mergeFieldGridHost(
	grid?: ElementGridConfig,
	style?: HostStyle,
	themeId?: string,
): { themeId: string; style: HostStyle } {
	return {
		themeId: themeId ?? (resolveFormEngine()?.getLayout() ?? getDefaultLayoutTheme()).id,
		style: { ...getGridItemVariables(grid), ...style },
	};
}

/**
 * Theme id and inline variables that make an element's children a grid of their own.
 *
 * @remarks
 * A container (a fieldset, an array row) lays its direct children out the way a
 * step does: put `se-form-grid`, `se-grid`, `data-se-theme={themeId}` and `style` on
 * the wrapper of its `FormElements`. The grid takes twelve tracks when a child
 * sets `width` or `offset`, and otherwise stays the engine's single column. The
 * theme comes from the given engine, else the engine rendering this element,
 * else the library default.
 */
export function mergeChildrenGridHost(
	elements: readonly unknown[],
	engine?: FormEngine,
): { themeId: string; style: CssVariables } {
	const layout = (engine ?? resolveFormEngine())?.getLayout() ?? getDefaultLayoutTheme();
	return { themeId: layout.id, style: getGridVariables(undefined, layout.grid, elements) };
}
