import type { JsxRenderable } from '@ecopages/jsx';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import type { FormShellLayout, RecipeSlot } from '@schema-engine/forms/recipes';

/** Serializable render inputs handed to recipe slot factories. */
export interface RecipeSlotContext {
	config?: NormalizedFormConfig;
	viewConfig?: Record<string, unknown>;
}

export type FormShellProps = FormShellLayout<JsxRenderable> & { config?: NormalizedFormConfig };

export type FormShellComponent = (props: FormShellProps) => JsxRenderable;

export interface RadiantRecipeAdapterPayload {
	shell?: FormShellComponent;
	slots: Partial<Record<Exclude<RecipeSlot, 'shell'>, (context?: RecipeSlotContext) => JsxRenderable>>;
}
