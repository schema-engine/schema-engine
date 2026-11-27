/**
 * @schema-engine/layout
 *
 * Domain-neutral layout for Schema Engine. `createLayoutTheme` compiles a grid vocabulary and
 * appearance axes into one theme with one id, one stylesheet and one `data-se-theme`
 * attribute; the grid schemas, named placement and pure appearance helpers sit beside it. Knows
 * nothing about forms, so any container of items can use it.
 *
 * @remarks
 * Every export is named, so an addition to a module never widens the public surface by itself.
 * The compilers that `createLayoutTheme` calls (`compileAppearance`, `resolveGridTheme`,
 * `getGridThemeCss`, `getAppearanceCss`) stay internal: a theme is the one way to get a stylesheet.
 */

export {
	AppearanceConfigSchema,
	createAppearanceSchema,
	withAppearanceAxes,
	withSlotAppearanceAxes,
} from './schemas/appearance';
export type { AppearanceConfig } from './schemas/appearance';

export {
	ElementGridConfigSchema,
	GridBreakpointConfigSchema,
	GridGapTokens,
	GridLayoutConfigSchema,
	GridOffsetNames,
	GridWidthNames,
	ItemGridBreakpointSchema,
} from './schemas/grid';
export type {
	ElementGridConfig,
	GridBreakpointConfig,
	GridGapToken,
	GridLayoutConfig,
	GridOffsetName,
	GridWidthName,
	ItemGridBreakpointConfig,
} from './schemas/grid';

export {
	builtInAxes,
	checkAppearance,
	defineAxis,
	getAppearanceAttributes,
	mergeAppearance,
	pickSupportedAppearance,
} from './lib/appearance';
export type {
	AnyAxisRegistration,
	AppearanceAxisList,
	AppearanceInput,
	AppearanceSelection,
	AppearanceTokens,
	AxisDefinition,
	AxisRegistration,
	AxisRegistry,
	BuiltInAppearanceAxes,
	ResolvedAppearanceAxes,
	SlotAppearanceAxes,
} from './lib/appearance';

export {
	GRID_TEMPLATE_KEYS,
	WIDTH_TRACKS,
	areaNames,
	areaTemplateIssues,
	cascadeValues,
	elementAreaSlots,
	elementGridKeys,
	elementHiddenSlots,
	elementIsSubgrid,
	elementUsesGridWidths,
	gridAreaTemplates,
	gridSpanIssues,
	gridUsesAreas,
	namedPlacementOverflow,
	spanPlacementIssue,
	subgridPlacementIssue,
} from './lib/grid-placement';
export type { CascadeSlot, GridAreaRows, GridAreaTemplates, GridBreakpointToken } from './lib/grid-placement';

export {
	GRID_CLASS,
	GRID_CONTAINER_CLASS,
	GRID_ITEM_CLASS,
	GRID_SUBGRID_CLASS,
	getGridItemVariables,
	getGridVariables,
} from './lib/grid-styles';
export type {
	CssVariables,
	GridGapScale,
	GridQueryMode,
	GridThemeOptions,
	NormalizedGridTheme,
} from './lib/grid-styles';

export { findSubgridChainBreaks } from './lib/subgrid-chain';
export type { SubgridChainBreak } from './lib/subgrid-chain';

export { assertAxesNotReserved, createLayoutTheme, getDefaultLayoutTheme, isLayoutTheme } from './lib/layout-theme';
export type { LayoutIssue } from './lib/layout-issue';
export type {
	LayoutAxes,
	LayoutInput,
	LayoutTheme,
	LayoutThemeCompilerOptions,
	LayoutThemeOptions,
} from './lib/layout-theme';

export { bindRecipe } from './recipes/bind-recipe';
export { defineProtocolRecipeSpec } from './recipes/define-recipe-spec';
export type { ProtocolRecipeSpecDefinition, RecipeViewSchema } from './recipes/define-recipe-spec';
export { mergeSlotDefaults } from './recipes/merge-slot-defaults';
export { assertRecipeRules, createRecipeRegistry, defineRecipeProtocol } from './recipes/protocol';
export type { KindOf, RecipeProtocol, RecipeRule, RecipeShape, SlotOf } from './recipes/protocol';
export { resolveRecipeView } from './recipes/resolve-recipe-view';
export type {
	RecipeViewInput,
	RecipeViewScope,
	RecipeViewSource,
	ResolvedRecipeView,
} from './recipes/resolve-recipe-view';
export type {
	ProtocolRecipeRegistration,
	ProtocolRecipeSlotSchemas,
	ProtocolRecipeSpec,
	RecipeMetadata,
	RecipeSlotDefaults,
} from './recipes/types';
export { readSlotConfig } from './recipes/view-model';
export type { RecipeViewModel } from './recipes/view-model';
