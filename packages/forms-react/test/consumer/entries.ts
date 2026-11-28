/**
 * What an app sees of the published package: every public entry read by name, and every removed one read under
 * `@ts-expect-error`. `scripts/check-dist-types.ts` compiles it in a scratch project that links the built package into
 * `node_modules`, with no `paths`, so each import resolves through the package's `exports` map to `dist`, and a subpath
 * the map dropped is a "module not found" error, which a source alias would hide. The package's own `tsconfig.test-types.json`
 * leaves this folder out. Run via: pnpm check:dist-types, after `build:lib`.
 */
import { FormEngineProvider, FormProvider, FormRenderer } from '@schema-engine/forms-react';
import type { FormEngineProviderProps, FormRendererProps } from '@schema-engine/forms-react';
import {
	ChildGrid,
	defineRecipe,
	FormElement,
	FormElements,
	ViewProvider,
} from '@schema-engine/forms-react/primitives';
import type {
	ChildGridProps,
	FormElementProps,
	FormElementsProps,
	FormShellComponent,
	FormShellProps,
	ReactRecipeAdapterPayload,
} from '@schema-engine/forms-react/primitives';
import { combineHandlers, useFormContext, useFormEngine, useFormField } from '@schema-engine/forms-react/hooks';
import { FormDebugger } from '@schema-engine/forms-react/debugger';
import type { FormDebuggerProps } from '@schema-engine/forms-react/debugger';

export const values = [
	FormEngineProvider,
	FormProvider,
	FormRenderer,
	ChildGrid,
	defineRecipe,
	FormElement,
	FormElements,
	ViewProvider,
	combineHandlers,
	useFormContext,
	useFormEngine,
	useFormField,
	FormDebugger,
];

export type Types = [
	FormEngineProviderProps,
	FormRendererProps,
	ChildGridProps,
	FormElementProps,
	FormElementsProps,
	FormShellComponent,
	FormShellProps,
	ReactRecipeAdapterPayload,
	FormDebuggerProps,
];

// @ts-expect-error `/contexts` is removed: `ViewProvider` is on `/primitives`.
export type Contexts = typeof import('@schema-engine/forms-react/contexts');
// @ts-expect-error `/components/form-debugger` is removed: `FormDebugger` is on `/debugger`.
export type OldDebugger = typeof import('@schema-engine/forms-react/components/form-debugger');

type Root = typeof import('@schema-engine/forms-react');

// @ts-expect-error `FormEngineContext` is internal: read the engine with `useFormEngine`.
export type RootFormEngineContext = Root['FormEngineContext'];
// @ts-expect-error `createFormEngineContextValue` is internal.
export type RootCreateFormEngineContextValue = Root['createFormEngineContextValue'];
// @ts-expect-error `defineRecipe` is on `/primitives` alone.
export type RootDefineRecipe = Root['defineRecipe'];
// @ts-expect-error `FormDebugger` is on `/debugger` alone.
export type RootFormDebugger = Root['FormDebugger'];
