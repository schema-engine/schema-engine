import type { JsxRenderable } from '@ecopages/jsx';
import type { FormMeta } from '@/lib/instance-view';
import type { FormShellLayout, RecipeSlot } from '@schema-engine/forms/recipes';

/** Serializable render inputs handed to recipe slot factories. */
export interface RecipeSlotContext {
	meta?: FormMeta;
	viewConfig?: Record<string, unknown>;
}

export type FormShellProps = FormShellLayout<JsxRenderable> & { meta?: FormMeta };

export type FormShellComponent = (props: FormShellProps) => JsxRenderable;

export interface RadiantRecipeAdapterPayload {
	shell?: FormShellComponent;
	slots: Partial<Record<Exclude<RecipeSlot, 'shell'>, (context?: RecipeSlotContext) => JsxRenderable>>;
}
