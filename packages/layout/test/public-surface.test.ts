import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import * as layout from '@/index';

const SUPPORTED_VALUE_EXPORTS = [
	'AppearanceConfigSchema',
	'ElementGridConfigSchema',
	'GRID_CLASS',
	'GRID_CONTAINER_CLASS',
	'GRID_ITEM_CLASS',
	'GRID_TEMPLATE_KEYS',
	'GridBreakpointConfigSchema',
	'GridGapTokens',
	'GridLayoutConfigSchema',
	'GridOffsetNames',
	'GridWidthNames',
	'ItemGridBreakpointSchema',
	'WIDTH_TRACKS',
	'areaNames',
	'areaTemplateIssues',
	'assertAxesNotReserved',
	'assertRecipeRules',
	'bindRecipe',
	'builtInAxes',
	'cascadeValues',
	'checkAppearance',
	'createAppearanceSchema',
	'createLayoutTheme',
	'createRecipeRegistry',
	'defineAxis',
	'defineProtocolRecipeSpec',
	'defineRecipeProtocol',
	'elementAreaSlots',
	'elementGridKeys',
	'elementHiddenSlots',
	'elementUsesGridWidths',
	'getAppearanceAttributes',
	'getDefaultLayoutTheme',
	'getGridItemVariables',
	'getGridVariables',
	'gridAreaTemplates',
	'gridUsesAreas',
	'isLayoutTheme',
	'mergeAppearance',
	'mergeSlotDefaults',
	'namedPlacementOverflow',
	'pickSupportedAppearance',
	'readSlotConfig',
	'resolveRecipeView',
	'withAppearanceAxes',
	'withSlotAppearanceAxes',
];

const INTERNAL_EXPORTS = [
	'BREAKPOINT_ORDER',
	'CASCADE_SLOTS',
	'GridGapValueSchema',
	'WIDTH_SPANS',
	'areasTemplateValue',
	'assertAxisNotReserved',
	'canonicalGridTheme',
	'carryNamedPlacement',
	'compileAppearance',
	'elementGridSlots',
	'getAppearanceCss',
	'getGridThemeCss',
	'getSlotConfig',
	'resolveGridTheme',
	'usesGridWidths',
];

describe('the layout public surface', () => {
	test('the root entry exports exactly the supported values', () => {
		expect(Object.keys(layout).sort()).toEqual([...SUPPORTED_VALUE_EXPORTS].sort());
	});

	test.each(INTERNAL_EXPORTS)('%s stays internal', (name) => {
		expect(layout).not.toHaveProperty(name);
	});

	test('the root entry has no star re-export', () => {
		const source = readFileSync(resolve(__dirname, '../src/index.ts'), 'utf8');
		expect(source).not.toMatch(/export\s+(?:type\s+)?\*/);
	});

	test('the package publishes one entry, so nothing else is reachable', () => {
		const manifest = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8')) as {
			exports: Record<string, unknown>;
		};
		expect(Object.keys(manifest.exports).sort()).toEqual(['.', './package.json']);
	});
});
