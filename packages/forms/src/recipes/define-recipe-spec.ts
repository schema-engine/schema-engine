import * as z from 'zod/mini';
import type { RecipeKind, RecipeSlot, RecipeSpec } from './types';
import { RECIPE_SLOT_ORDER } from './types';

export function mergeRecipeSlotSchemas(
	$type: string,
	slotSchemas: Partial<Record<RecipeSlot, z.ZodMiniType>>,
): z.ZodMiniType {
	const shape: Record<string, z.ZodMiniType> = {
		$type: z.literal($type),
	};

	for (const [slot, schema] of Object.entries(slotSchemas)) {
		if (schema) {
			shape[slot] = z.optional(schema);
		}
	}

	return z.strictObject(shape);
}

export function assertRecipeSlotSchemas(
	kind: RecipeKind,
	slotSchemas: Partial<Record<RecipeSlot, z.ZodMiniType>>,
): void {
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
 * submit-only bar. Wizard recipes must declare `actions`. Built-in specs are
 * exported from this module.
 */
export function defineRecipeSpec<const TType extends string, TSchema extends z.ZodMiniType>(definition: {
	$type: TType;
	kind: RecipeKind;
	metadata: RecipeSpec<TType>['metadata'];
	slotSchemas?: Partial<Record<RecipeSlot, z.ZodMiniType>>;
	slotDefaults?: RecipeSpec<TType>['slotDefaults'];
	schema?: TSchema;
}): RecipeSpec<TType, TSchema> {
	const slotSchemas = definition.slotSchemas ?? {};
	assertRecipeSlotSchemas(definition.kind, slotSchemas);
	const schema = (definition.schema ?? mergeRecipeSlotSchemas(definition.$type, slotSchemas)) as TSchema;
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
