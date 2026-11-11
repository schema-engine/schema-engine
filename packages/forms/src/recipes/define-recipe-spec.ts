import * as z from 'zod/mini';
import type { RecipeKind, RecipeMetadata, RecipeSlot, RecipeSpec } from './types';
import { RECIPE_SLOT_ORDER } from './types';

export type RecipeSlotSchemas = Partial<Record<RecipeSlot, z.ZodMiniType>>;

/**
 * Strict view schema of a spec: the literal `$type` plus each declared slot as an optional key.
 *
 * @remarks
 * Keeping the concrete object type, rather than `z.ZodMiniType`, lets the engine infer the
 * authoring type of `view` from a registration.
 */
export type RecipeViewSchema<TType extends string, TSlots extends RecipeSlotSchemas> = z.ZodMiniObject<
	{ $type: z.ZodMiniLiteral<TType> } & {
		[K in keyof TSlots]: TSlots[K] extends z.ZodMiniType ? z.ZodMiniOptional<TSlots[K]> : never;
	},
	z.core.$strict
>;

function mergeRecipeSlotSchemas<const TType extends string, const TSlots extends RecipeSlotSchemas>(
	$type: TType,
	slotSchemas: TSlots,
): RecipeViewSchema<TType, TSlots> {
	const shape: Record<string, z.ZodMiniType> = {
		$type: z.literal($type),
	};

	for (const [slot, schema] of Object.entries(slotSchemas)) {
		if (schema) {
			shape[slot] = z.optional(schema);
		}
	}

	return z.strictObject(shape) as unknown as RecipeViewSchema<TType, TSlots>;
}

export function assertRecipeSlotSchemas(kind: RecipeKind, slotSchemas: RecipeSlotSchemas): void {
	if (kind === 'single-step' && slotSchemas.progress) {
		throw new Error("Recipes with kind 'single-step' cannot declare a progress slot.");
	}
	if (kind === 'wizard' && !slotSchemas.actions) {
		throw new Error("Recipes with kind 'wizard' must declare an actions slot.");
	}
}

/**
 * Declares a recipe's `$type`, kind, slot schemas, and metadata.
 *
 * @remarks
 * Single-step recipes cannot declare `progress`; their `actions` slot is the
 * submit-only bar. Wizard recipes must declare `actions`.
 */
export function defineRecipeSpec<
	const TType extends string,
	const TSlots extends RecipeSlotSchemas = Record<never, never>,
>(definition: {
	$type: TType;
	kind: RecipeKind;
	metadata: RecipeMetadata;
	slotSchemas?: TSlots;
	slotDefaults?: RecipeSpec['slotDefaults'];
}): RecipeSpec<TType, RecipeViewSchema<TType, TSlots>, TSlots> {
	const slotSchemas = (definition.slotSchemas ?? {}) as TSlots;
	assertRecipeSlotSchemas(definition.kind, slotSchemas);
	const schema = mergeRecipeSlotSchemas(definition.$type, slotSchemas);
	const slots = RECIPE_SLOT_ORDER.filter((slot) => slotSchemas[slot]);

	return {
		$type: definition.$type,
		kind: definition.kind,
		slots,
		slotSchemas,
		slotDefaults: definition.slotDefaults,
		metadata: definition.metadata,
		schema,
	};
}
