import type * as z from 'zod/mini';
import type { ComponentMetadata } from '@schema-engine/registry';

export type RecipeKind = 'single-step' | 'wizard';

export type RecipeSlot = 'shell' | 'header' | 'progress' | 'actions';

export const RECIPE_SLOT_ORDER = ['shell', 'header', 'progress', 'actions'] as const satisfies readonly RecipeSlot[];

export interface RecipeMetadata extends ComponentMetadata {
	category?: string;
}

export interface RecipeDescriptor {
	$type: string;
	kind: RecipeKind;
	slots: RecipeSlot[];
	metadata: RecipeMetadata;
	viewSchema: Record<string, unknown>;
}

export interface ViewCatalog {
	recipes: RecipeDescriptor[];
	rules: {
		noViewSingleStep: string;
		noViewMultiStep: string;
		oneViewPerForm: string;
	};
}

/**
 * Slot config applied beneath a form's own slot config, typed as the input of each declared slot schema.
 *
 * @remarks
 * Undeclared slots and misspelled keys are compile errors; `defineRecipeSpec` also parses each
 * default against its slot schema.
 */
export type RecipeSlotDefaults<TSlots extends Partial<Record<RecipeSlot, z.ZodMiniType>>> = {
	[K in keyof TSlots]?: TSlots[K] extends z.ZodMiniType ? z.input<TSlots[K]> : never;
};

export interface RecipeSpec<
	TType extends string = string,
	TSchema extends z.ZodMiniType = z.ZodMiniType,
	TSlots extends Partial<Record<RecipeSlot, z.ZodMiniType>> = Partial<Record<RecipeSlot, z.ZodMiniType>>,
> {
	$type: TType;
	kind: RecipeKind;
	slots: RecipeSlot[];
	slotSchemas: TSlots;
	slotDefaults?: RecipeSlotDefaults<TSlots>;
	/**
	 * Appearance axes each slot supports (`{ shell: ['size', 'surface'] }`); undeclared axes fail validation on that slot.
	 *
	 * @remarks
	 * A slot that declares axes must accept an `appearance` key in its schema, so authored
	 * configs type-check and the JSON Schema lists it. `validateForm` handles the key itself and
	 * writes the resolved selection back, so the slot schema never sees it.
	 */
	appearanceAxes?: { [K in keyof TSlots]?: readonly string[] };
	metadata: RecipeMetadata;
	schema: TSchema;
}

/**
 * Render payload an adapter binds to a spec: `slots` holds exactly the spec's non-shell slots,
 * each required. `shell` is required only when the spec declares a shell config; a spec without
 * one may still bind a shell component (the stack shell has no config).
 *
 * @remarks
 * Adapters supply the component types, so a payload that omits a declared slot, or adds an
 * undeclared one, fails to type-check at the binding site.
 */
export type RecipeRenderPayload<
	TSlots extends Partial<Record<RecipeSlot, z.ZodMiniType>>,
	TShell,
	TSlot,
> = ('shell' extends keyof TSlots ? { shell: TShell } : { shell?: TShell }) & {
	slots: { [K in Exclude<keyof TSlots, 'shell'>]-?: TSlot };
};

export interface FormShellLayout<TNode> {
	slots: {
		header?: TNode;
		progress?: TNode;
		content: TNode;
		actions?: TNode;
	};
	viewConfig: Record<string, unknown>;
}
