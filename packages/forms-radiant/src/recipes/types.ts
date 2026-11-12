import type { JsxRenderable } from '@ecopages/jsx';
import type { FormMeta } from '@/lib/instance-view';
import type { FormShellLayout, RecipeRenderPayload, RecipeSlot } from '@schema-engine/forms/recipes';
import type * as z from 'zod/mini';

/** Serializable render inputs handed to recipe slot factories. */
export interface RecipeSlotContext {
	meta?: FormMeta;
	/**
	 * The config of the slot being rendered, taken from the normalized view.
	 *
	 * @remarks
	 * The view schema has already parsed it, so a block narrows it to its own config type.
	 */
	slotConfig?: Record<string, unknown>;
}

export type FormShellProps = FormShellLayout<JsxRenderable> & { meta?: FormMeta };

export type FormShellComponent = (props: FormShellProps) => JsxRenderable;

export interface RadiantRecipeAdapterPayload {
	shell?: FormShellComponent;
	slots: Partial<Record<Exclude<RecipeSlot, 'shell'>, (context?: RecipeSlotContext) => JsxRenderable>>;
}

export type RadiantRecipeSlotFactory = (context?: RecipeSlotContext) => JsxRenderable;

/** Radiant payload for a spec declaring `TSlots`; `RadiantRecipeAdapterPayload` is the loose form the renderer reads. */
export type RadiantRecipePayload<TSlots extends Partial<Record<RecipeSlot, z.ZodMiniType>>> = RecipeRenderPayload<
	TSlots,
	FormShellComponent,
	RadiantRecipeSlotFactory
>;
