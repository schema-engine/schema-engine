/**
 * Stable runtime contracts used by consumer-owned form registrations.
 *
 * Registry components must use this entrypoint instead of reaching into
 * package implementation paths.
 */
import type React from 'react';
import {
	defineFormRecipe,
	type FormShellLayout,
	type RecipeRenderPayload,
	type RecipeSlot,
	type RecipeSpec,
} from '@schema-engine/forms/recipes';
import type * as z from 'zod/mini';

export { FormElement } from './components/internals/field-renderer';
export type { FormElementProps } from './components/internals/field-renderer';
export { FormElements } from './components/internals/form-elements';
export type { FormElementsProps } from './components/internals/form-elements';

/** Stable React recipe contracts for consumer-owned view implementations. */
export type FormShellProps = FormShellLayout<React.ReactNode>;
export type FormShellComponent = React.FC<FormShellProps>;
export interface ReactRecipeAdapterPayload {
	shell?: FormShellComponent;
	slots: Partial<Record<'header' | 'progress' | 'actions', React.FC>>;
}

/**
 * Binds a recipe spec to React components, requiring exactly the slots the spec declares.
 *
 * @remarks
 * Wraps the renderer-neutral `defineFormRecipe`; the payload type is what makes a missing or
 * extra slot a compile error.
 */
export function defineRecipe<
	const TType extends string,
	TSlots extends Partial<Record<RecipeSlot, z.ZodMiniType>>,
	TSchema extends z.ZodMiniType,
>(spec: RecipeSpec<TType, TSchema, TSlots>, payload: RecipeRenderPayload<TSlots, FormShellComponent, React.FC>) {
	return defineFormRecipe(spec, payload);
}
