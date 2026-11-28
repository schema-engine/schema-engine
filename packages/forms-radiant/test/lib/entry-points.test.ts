import path from 'node:path';
import { describe, expect, test } from 'vitest';
import * as entry from '@schema-engine/forms-radiant/primitives';
import {
	entryExportNames,
	symbolsFromOtherPackages,
	symbolsSharedByEntries,
} from '../../../../test-utils/entry-exports';
import {
	exportsKeys,
	RENDERER_AUTHOR_CONTRACT,
	SHARED_RENDERER_ENTRIES,
} from '../../../../test-utils/renderer-entries';

const packageDir = path.resolve(import.meta.dirname, '../..');

test('a container element lays out its children with ChildGrid alone', () => {
	expect(entry).toHaveProperty('ChildGrid');
	expect(entry).not.toHaveProperty('mergeChildrenGridHost');
});

describe('the renderer entry layout', () => {
	test('the exports map holds the shared entries, ./registrations and ./index.css, nothing else', () => {
		expect(exportsKeys(packageDir).toSorted()).toEqual(
			[...SHARED_RENDERER_ENTRIES, './registrations', './index.css'].toSorted(),
		);
	});

	test('the root renders a form and holds nothing an author builds elements or recipes from', () => {
		const root = entryExportNames(packageDir, '.');
		expect(root).toEqual(
			[
				'createRadiantFormEngine',
				'FormRenderer',
				'FormRendererElement',
				'FormController',
				'FormEngineController',
				'FormSubmitContext',
				'FormAction',
				'schemaFormRegistrations',
				'createRadiantPhoneValidationRegistration',
				'CardRecipe',
				'SplitScreenRecipe',
				'HeroBackgroundRecipe',
				'BareControlsRecipe',
				'WizardRecipe',
				'SidebarWizardRecipe',
				'CardWizardRecipe',
				'HeroWizardRecipe',
				'SplitScreenWizardRecipe',
				'radiantRecipes',
			].toSorted(),
		);
		for (const name of RENDERER_AUTHOR_CONTRACT) expect(root).not.toContain(name);
	});

	test('/primitives holds the author contract, the recipe types, the contexts and the field helpers', () => {
		expect(entryExportNames(packageDir, './primitives')).toEqual(
			[
				...RENDERER_AUTHOR_CONTRACT,
				'FormField',
				'FormFieldElement',
				'FormMeta',
				'RadiantRecipeAdapterPayload',
				'RadiantRecipePayload',
				'RadiantRecipeSlotFactory',
				'formInstanceContext',
				'FormInstanceContextValue',
				'formEngineContext',
				'FormEngineContextValue',
				'combineHandlers',
				'mergeFieldGridHost',
			].toSorted(),
		);
	});

	test('/debugger holds the debugger, its element and its props, nothing else', () => {
		expect(entryExportNames(packageDir, './debugger')).toEqual([
			'FormDebugger',
			'FormDebuggerElement',
			'FormDebuggerProps',
		]);
	});

	test('the views inside FormRenderer are internal: they are on no entry', () => {
		const exported = exportsKeys(packageDir)
			.filter((key) => !key.endsWith('.css') && key !== './package.json')
			.flatMap((key) => entryExportNames(packageDir, key));
		expect(exported).not.toContain('FormInstance');
		expect(exported).not.toContain('RecipeRenderer');
	});

	test('every symbol has one import path: none is on two entries or declared by another package', () => {
		expect(symbolsSharedByEntries(packageDir)).toEqual([]);
		expect(symbolsFromOtherPackages(packageDir)).toEqual([]);
	});
});
