import {
	defineProtocolRecipeSpec,
	type ProtocolRecipeSpecDefinition,
	type RecipeViewSchema,
} from '@schema-engine/layout';
import { formRecipeProtocol, type RecipeKind, type RecipeSlot } from './protocol';
import type { RecipeSlotSchemas, RecipeSpec } from './types';

export type { RecipeViewSchema } from '@schema-engine/layout';

/**
 * Declares a form recipe's `$type`, kind, slot schemas, and metadata.
 *
 * @remarks
 * `defineProtocolRecipeSpec` from `@schema-engine/layout` on {@link formRecipeProtocol}: single-step
 * recipes cannot declare `progress` (their `actions` slot is the submit-only bar), and wizard
 * recipes must declare `actions`.
 */
export function defineRecipeSpec<
	const TType extends string,
	const TSlots extends RecipeSlotSchemas = Record<never, never>,
>(
	definition: ProtocolRecipeSpecDefinition<RecipeSlot, RecipeKind, TType, TSlots>,
): RecipeSpec<TType, RecipeViewSchema<TType, TSlots>, TSlots> {
	return defineProtocolRecipeSpec(formRecipeProtocol, definition);
}
