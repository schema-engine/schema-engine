import type { JsxRenderable } from '@ecopages/jsx';
import type { FormMeta } from '@/lib/instance-view.js';
import type { FormShellLayout, RecipeRenderPayload, RecipeSlot, RecipeSlotSchemas } from '@schema-engine/forms/recipes';

/** Serializable render inputs handed to recipe slot factories. */
export interface RecipeSlotContext<TConfig = Record<string, unknown>> {
	meta?: FormMeta;
	/**
	 * The config of the slot being rendered, taken from the normalized view.
	 *
	 * @remarks
	 * The view schema has already parsed it, so a block declares its own config type as `TConfig`.
	 */
	slotConfig?: TConfig;
}

export type FormShellProps = FormShellLayout<JsxRenderable> & { meta?: FormMeta };

export type FormShellComponent = (props: FormShellProps) => JsxRenderable;

export interface RadiantRecipeAdapterPayload {
	shell?: FormShellComponent;
	slots: Partial<Record<Exclude<RecipeSlot, 'shell'>, (context?: RecipeSlotContext) => JsxRenderable>>;
}

/**
 * A slot factory, whatever config type it declares.
 *
 * @remarks
 * A factory takes `RecipeSlotContext<ItsConfig>`. Parameters are contravariant, so `never`
 * accepts every such factory; the renderer reads them through `RadiantRecipeAdapterPayload`,
 * where the view schema has already guaranteed the config.
 */
export type RadiantRecipeSlotFactory = (context?: RecipeSlotContext<never>) => JsxRenderable;

/** Radiant payload for a spec declaring `TSlots`; `RadiantRecipeAdapterPayload` is the loose form the renderer reads. */
export type RadiantRecipePayload<TSlots extends RecipeSlotSchemas> = RecipeRenderPayload<
	TSlots,
	FormShellComponent,
	RadiantRecipeSlotFactory
>;
