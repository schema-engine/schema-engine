import type { ElementGridConfig } from '@schema-engine/forms/schemas';
import { getDefaultGridTheme, getFieldGridVariables } from '@schema-engine/forms/lib/grid-styles';
import { owningFormEngine } from '@/contexts/form-engine-owner';

export { owningFormEngine } from '@/contexts/form-engine-owner';

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
		themeId: themeId ?? owningFormEngine()?.getGridTheme().id ?? getDefaultGridTheme().id,
		style: { ...getFieldGridVariables(grid), ...style },
	};
}
