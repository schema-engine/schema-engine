import type { ElementGridConfig } from '@schema-engine/forms/schemas';
import {
	getDefaultGridTheme,
	getFieldGridHostProps,
	getFieldGridVariables,
	getFormGridVariables,
	getGridThemeCss,
	resolveGridGap,
	resolveGridTheme,
	type CssVariables,
	type FieldGridHost,
	type GridBreakpointToken,
	type GridGapToken,
	type GridThemeOptions,
	type NormalizedGridTheme,
} from '@schema-engine/forms/lib/grid-styles';
import { owningGridThemeId } from '@/contexts/form-engine-owner';

export {
	getFieldGridVariables,
	getFormGridVariables,
	getGridThemeCss,
	resolveGridGap,
	resolveGridTheme,
	type CssVariables,
	type FieldGridHost,
	type GridBreakpointToken,
	type GridGapToken,
	type GridThemeOptions,
	type NormalizedGridTheme,
};

export { owningFormEngine, owningGridThemeId } from '@/contexts/form-engine-owner';

type HostStyle = Record<string, string | number | undefined>;

function resolveThemeId(explicitThemeId?: string): string {
	return explicitThemeId ?? owningGridThemeId() ?? getDefaultGridTheme().id;
}

export function mergeFieldGridHost(
	grid?: ElementGridConfig,
	style?: HostStyle,
	themeId?: string,
): { themeId: string; style: HostStyle } {
	const host = getFieldGridHostProps(resolveThemeId(themeId), grid);
	const merged: HostStyle = {};
	Object.assign(merged, host.style, style);
	return { themeId: host.themeId, style: merged };
}
