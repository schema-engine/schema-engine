import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import ts from 'typescript';
import * as layout from '@/index';
import * as layoutTesting from '@/testing';

const SUPPORTED_VALUE_EXPORTS = [
	'AppearanceConfigSchema',
	'ElementGridConfigSchema',
	'GRID_CLASS',
	'GRID_CONTAINER_CLASS',
	'GRID_ITEM_CLASS',
	'GRID_SUBGRID_CLASS',
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
	'elementIsSubgrid',
	'elementUsesGridWidths',
	'getAppearanceAttributes',
	'getDefaultLayoutTheme',
	'getGridItemVariables',
	'getGridVariables',
	'gridAreaTemplates',
	'gridSpanIssues',
	'gridUsesAreas',
	'isLayoutTheme',
	'mergeAppearance',
	'mergeSlotDefaults',
	'namedPlacementOverflow',
	'pickSupportedAppearance',
	'readSlotConfig',
	'resolveRecipeView',
	'spanPlacementIssue',
	'subgridPlacementIssue',
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

	test('the package publishes the root entry and the testing entry, so nothing else is reachable', () => {
		const manifest = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8')) as {
			exports: Record<string, unknown>;
		};
		expect(Object.keys(manifest.exports).sort()).toEqual(['.', './package.json', './testing']);
	});

	test('the root entry leaves the DOM check to the testing entry', () => {
		expect(layout).not.toHaveProperty('findSubgridChainBreaks');
		expect(Object.keys(layoutTesting)).toEqual(['findSubgridChainBreaks']);
	});
});

describe('the layout root entry on a server', () => {
	const DOM_TYPE_NAMES =
		/\b(?:ParentNode|Node|NodeList|Element|HTMLElement|SVGElement|Document|DocumentFragment|ShadowRoot|Window|Event|EventTarget)\b/;

	/**
	 * The published declaration files a consumer's compiler reads from the root entry, without comments.
	 *
	 * @remarks
	 * Walks the relative imports of `dist/index.d.ts`, which `test:all` reads after `build:lib`, so the check is the
	 * shape users install and costs a file scan, not a compile of the source.
	 */
	function emittedDeclarations(): Map<string, string> {
		const dist = resolve(__dirname, '../dist');
		const declarations = new Map<string, string>();
		const pending = [resolve(dist, 'index.d.ts')];
		for (let file = pending.pop(); file !== undefined; file = pending.pop()) {
			if (declarations.has(file)) continue;
			const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.ESNext);
			const printed = ts.createPrinter({ removeComments: true }).printFile(source);
			declarations.set(file, printed);
			for (const [, specifier] of printed.matchAll(/from ['"](\.{1,2}\/[^'"]+)['"]/g)) {
				pending.push(resolve(dirname(file), specifier!.replace(/\.js$/, '.d.ts')));
			}
		}
		return declarations;
	}

	test('emits declarations that name no DOM type, so a server compiles without the DOM lib', () => {
		const declarations = emittedDeclarations();
		expect(declarations.size).toBeGreaterThan(10);
		const naming = [...declarations].filter(([, text]) => DOM_TYPE_NAMES.test(text)).map(([file]) => file);
		expect(naming).toEqual([]);
	});
});
