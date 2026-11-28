/**
 * What an app sees of the published package: every public entry read by name, and every removed one read under
 * `@ts-expect-error`. `scripts/check-dist-types.ts` compiles it in a scratch project that links the built package into
 * `node_modules`, with no `paths`, so each import resolves through the package's `exports` map to `dist`, and a subpath
 * the map dropped is a "module not found" error, which a source alias would hide. The package's own `tsconfig.test-types.json`
 * leaves this folder out. Run via: pnpm check:dist-types, after `build:lib`.
 */
import {
	createRadiantFormEngine,
	FormController,
	FormEngineController,
	FormRenderer,
	FormRendererElement,
	radiantRecipes,
	schemaFormRegistrations,
} from '@schema-engine/forms-radiant';
import type { FormAction, FormSubmitContext } from '@schema-engine/forms-radiant';
import {
	ChildGrid,
	combineHandlers,
	defineRecipe,
	FormElement,
	FormElements,
	formEngineContext,
	FormField,
	formInstanceContext,
	mergeFieldGridHost,
} from '@schema-engine/forms-radiant/primitives';
import type {
	ChildGridProps,
	FormElementsProps,
	FormMeta,
	FormShellComponent,
	FormShellProps,
	RadiantRecipeAdapterPayload,
	RadiantRecipePayload,
	RadiantRecipeSlotFactory,
} from '@schema-engine/forms-radiant/primitives';
import { InputElementRegistration } from '@schema-engine/forms-radiant/registrations';
import { FormDebugger, FormDebuggerElement } from '@schema-engine/forms-radiant/debugger';
import type { FormDebuggerProps } from '@schema-engine/forms-radiant/debugger';

export const values = [
	createRadiantFormEngine,
	FormController,
	FormEngineController,
	FormRenderer,
	FormRendererElement,
	radiantRecipes,
	schemaFormRegistrations,
	ChildGrid,
	combineHandlers,
	defineRecipe,
	FormElement,
	FormElements,
	formEngineContext,
	FormField,
	formInstanceContext,
	mergeFieldGridHost,
	InputElementRegistration,
	FormDebugger,
	FormDebuggerElement,
];

export type Types = [
	FormAction,
	FormSubmitContext,
	ChildGridProps,
	FormElementsProps,
	FormMeta,
	FormShellComponent,
	FormShellProps,
	RadiantRecipeAdapterPayload,
	RadiantRecipePayload<{}>,
	RadiantRecipeSlotFactory,
	FormDebuggerProps,
];

// @ts-expect-error `/hooks` is removed: `combineHandlers` and `mergeFieldGridHost` are on `/primitives`.
export type Hooks = typeof import('@schema-engine/forms-radiant/hooks');
// @ts-expect-error `/contexts` is removed: the contexts are on `/primitives`.
export type Contexts = typeof import('@schema-engine/forms-radiant/contexts');

type Root = typeof import('@schema-engine/forms-radiant');

// @ts-expect-error `FormInstance` is the view inside `FormRenderer`, which is the one an app uses.
export type RootFormInstance = Root['FormInstance'];
// @ts-expect-error `RecipeRenderer` is the view inside `FormInstance`.
export type RootRecipeRenderer = Root['RecipeRenderer'];
// @ts-expect-error `defineRecipe` is on `/primitives` alone.
export type RootDefineRecipe = Root['defineRecipe'];
// @ts-expect-error `FormElements` is on `/primitives` alone.
export type RootFormElements = Root['FormElements'];
// @ts-expect-error `FormDebugger` is on `/debugger` alone.
export type RootFormDebugger = Root['FormDebugger'];
