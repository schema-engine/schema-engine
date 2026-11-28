import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { SlotAppearanceAxes } from '../lib/appearance.js';
import type { ProtocolRecipeRegistration, ProtocolRecipeSlotSchemas, ProtocolRecipeSpec } from './types.js';

/**
 * @remarks
 * Typed by the spec, so the registration carries the protocol's slot and kind names. Domains wrap it
 * to type `render` for their renderers.
 *
 * The casts widen `slotDefaults` and `appearanceAxes`: the spec types them by the slot schemas it
 * was defined with (`RecipeSlotDefaults<TSlots>`, `SlotAppearanceAxes<keyof TSlots>`), and the
 * registration by the protocol's slot names, which cannot be derived from the schemas generically.
 */
export function bindRecipe<
	TSlot extends string,
	TKind extends string,
	const TType extends string,
	TSchema extends StandardSchemaV1,
	TSlots extends ProtocolRecipeSlotSchemas<TSlot>,
	TRender,
>(
	spec: ProtocolRecipeSpec<TSlot, TKind, TType, TSchema, TSlots>,
	render: TRender,
): ProtocolRecipeRegistration<TSlot, TKind, TType, TSchema, TRender> {
	return {
		$type: spec.$type,
		kind: spec.kind,
		slots: spec.slots,
		schema: spec.schema,
		metadata: spec.metadata,
		slotDefaults: spec.slotDefaults as Partial<Record<TSlot, Record<string, unknown>>> | undefined,
		appearanceAxes: spec.appearanceAxes as SlotAppearanceAxes<TSlot> | undefined,
		slotSchemas: spec.slotSchemas,
		render,
	};
}
