import { getDefaultLayoutTheme, getGridItemVariables, type ElementGridConfig } from '@schema-engine/layout';
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
