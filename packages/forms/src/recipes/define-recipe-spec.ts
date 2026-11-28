import {
	defineProtocolRecipeSpec,
	type ProtocolRecipeSpecDefinition,
	type RecipeViewSchema,
} from '@schema-engine/layout';
import { formRecipeProtocol, type RecipeKind, type RecipeSlot } from './protocol';
import type { RecipeSlotSchemas, RecipeSpec } from './types';

/**
 * Declares a form recipe's `$type`, kind, slot schemas, and metadata.
 *
 * @remarks
 * `defineProtocolRecipeSpec` from `@schema-engine/layout` on {@link formRecipeProtocol}: single-step
 * recipes cannot declare `progress` (their `actions` slot is the submit-only bar), and wizard
 * recipes must declare `actions`. A spec that leaves out `slotSchemas` declares no slots, so `TSlots` defaults to
 * the empty object type.
 */
export function defineRecipeSpec<const TType extends string, const TSlots extends RecipeSlotSchemas = {}>(
	definition: ProtocolRecipeSpecDefinition<RecipeSlot, RecipeKind, TType, TSlots>,
): RecipeSpec<TType, RecipeViewSchema<TType, TSlots>, TSlots> {
	return defineProtocolRecipeSpec(formRecipeProtocol, definition);
}
