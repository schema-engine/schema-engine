import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { BaseRegistration, ComponentMetadata } from '@schema-engine/registry';
import type { SlotAppearanceAxes } from '../lib/appearance.js';

export interface RecipeMetadata extends ComponentMetadata {
	category?: string;
}

/**
 * The schema of each slot a spec declares: any Standard Schema that validates synchronously.
 *
 * @remarks
 * The view schema runs each slot schema synchronously, as `resolveRecipeView` and the registry's `safeParseNode` need
 * an immediate result, so a slot schema that returns a Promise throws where a view is parsed.
 */
export type ProtocolRecipeSlotSchemas<TSlot extends string = string> = Partial<Record<TSlot, StandardSchemaV1>>;

/**
 * Slot config applied beneath a view's own slot config, typed as the input of each declared slot schema.
 *
 * @remarks
 * Undeclared slots and misspelled keys are compile errors; `defineProtocolRecipeSpec` also parses each
 * default against its slot schema.
 */
export type RecipeSlotDefaults<TSlots extends ProtocolRecipeSlotSchemas> = {
	[K in keyof TSlots]?: TSlots[K] extends StandardSchemaV1 ? StandardSchemaV1.InferInput<TSlots[K]> : never;
};

export interface ProtocolRecipeSpec<
	TSlot extends string = string,
	TKind extends string = string,
	TType extends string = string,
	TSchema extends StandardSchemaV1 = StandardSchemaV1,
	TSlots extends ProtocolRecipeSlotSchemas<TSlot> = ProtocolRecipeSlotSchemas<TSlot>,
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
	 * A slot that declares axes must accept an `appearance` key in its schema input, which the types enforce, so authored
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
export interface ProtocolRecipeRegistration<
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
	/**
	 * The schema of each declared slot, as the spec declared it.
	 *
	 * @remarks
	 * Set by `bindRecipe`. A domain's export reads it (forms: the JSON Schema of each slot); validation reads `schema`.
	 * A hand-written registration may leave it out. When set, its keys must be the recipe's `slots`.
	 */
	readonly slotSchemas?: ProtocolRecipeSlotSchemas<TSlot>;
	render: TRender;
}
