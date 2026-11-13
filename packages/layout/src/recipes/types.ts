import type * as z from 'zod/mini';
import type { BaseRegistration, ComponentMetadata } from '@schema-engine/registry';
import type { SlotAppearanceAxes } from '../lib/appearance';

export interface RecipeMetadata extends ComponentMetadata {
	category?: string;
}

export type RecipeSlotSchemas<TSlot extends string = string> = Partial<Record<TSlot, z.ZodMiniType>>;

/**
 * Slot config applied beneath a view's own slot config, typed as the input of each declared slot schema.
 *
 * @remarks
 * Undeclared slots and misspelled keys are compile errors; `defineRecipeSpec` also parses each
 * default against its slot schema.
 */
export type RecipeSlotDefaults<TSlots extends Partial<Record<string, z.ZodMiniType>>> = {
	[K in keyof TSlots]?: TSlots[K] extends z.ZodMiniType ? z.input<TSlots[K]> : never;
};

export interface RecipeSpec<
	TSlot extends string = string,
	TKind extends string = string,
	TType extends string = string,
	TSchema extends z.ZodMiniType = z.ZodMiniType,
	TSlots extends RecipeSlotSchemas<TSlot> = RecipeSlotSchemas<TSlot>,
> {
	$type: TType;
	kind: TKind;
	slots: TSlot[];
	slotSchemas: TSlots;
	slotDefaults?: RecipeSlotDefaults<TSlots>;
	/**
	 * Appearance axes each slot supports (`{ shell: ['size', 'surface'] }`); undeclared axes fail validation on that slot.
	 *
	 * @remarks
	 * A slot that declares axes must accept an `appearance` key in its schema, so authored
	 * configs type-check and the JSON Schema lists it. A validator that resolves the view (forms: `validateForm`) does not
	 * pass the key to the slot schema when it parses it, and writes the resolved selection back, so a renderer reading the
	 * normalized slot sees it.
	 */
	appearanceAxes?: SlotAppearanceAxes<keyof TSlots>;
	metadata: RecipeMetadata;
	schema: TSchema;
}

/**
 * A spec bound to a render payload, as registered in a domain's recipe registry.
 *
 * @remarks
 * `render` is whatever the domain's renderers need (shell and slot components); this package never
 * reads it.
 */
export interface RecipeRegistration<
	TSlot extends string = string,
	TKind extends string = string,
	TType extends string = string,
	TSchema extends BaseRegistration['schema'] = BaseRegistration['schema'],
	TRender = unknown,
> extends BaseRegistration {
	$type: TType;
	kind: TKind;
	slots: TSlot[];
	schema: TSchema;
	metadata: RecipeMetadata;
	slotDefaults?: Partial<Record<TSlot, Record<string, unknown>>>;
	appearanceAxes?: SlotAppearanceAxes<TSlot>;
	render: TRender;
}
