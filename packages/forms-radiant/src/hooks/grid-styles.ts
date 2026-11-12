import type { ElementGridConfig } from '@schema-engine/forms/schemas';
import {
	getDefaultGridTheme,
	getFieldGridVariables,
	getFormGridVariables,
	type CssVariables,
} from '@schema-engine/forms/lib/grid-styles';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';

type HostStyle = Record<string, string | number | undefined>;

/**
 * Grid placement variables plus the owning theme id for a field host element.
 *
 * @remarks
 * Single theme-id resolver for the Radiant renderer: an explicit id from the
 * renderer, else the engine rendering this field, else the library default for
 * hosts rendered outside any engine. Callers set
 * `data-se-grid-theme={themeId}` so the engine's generated field rules match.
 */
export function mergeFieldGridHost(
	grid?: ElementGridConfig,
	style?: HostStyle,
	themeId?: string,
): { themeId: string; style: HostStyle } {
	return {
		themeId: themeId ?? resolveFormEngine()?.getGridTheme().id ?? getDefaultGridTheme().id,
		style: { ...getFieldGridVariables(grid), ...style },
	};
}

/**
 * Theme id and inline variables that make an element's children a grid of their own.
 *
 * @remarks
 * A container (a fieldset, an array row) lays its direct children out the way a
 * step does: put `se-form-grid`, `data-se-grid-theme={themeId}` and `style` on
 * the wrapper of its `FormElements`. The grid takes twelve tracks when a child
 * sets `width` or `offset`, and otherwise stays the engine's single column. The
 * theme comes from the given engine, else the engine rendering this element,
 * else the library default.
 */
export function mergeChildrenGridHost(
	elements: readonly unknown[],
	engine?: FormEngine,
): { themeId: string; style: CssVariables } {
	const theme = (engine ?? resolveFormEngine())?.getGridTheme() ?? getDefaultGridTheme();
	return { themeId: theme.id, style: getFormGridVariables(undefined, theme, elements) };
}
