import { z } from 'zod';
import type { RecipeKind, RecipeSlot, RecipeSpec } from './types';
import { RECIPE_SLOT_ORDER } from './types';

export function mergeRecipeSlotSchemas(
	$type: string,
	slotSchemas: Partial<Record<RecipeSlot, z.ZodTypeAny>>,
): z.ZodTypeAny {
	const shape: Record<string, z.ZodTypeAny> = {
		$type: z.literal($type),
	};

	for (const [slot, schema] of Object.entries(slotSchemas)) {
		if (schema) {
			shape[slot] = schema.optional();
		}
	}

	return z.object(shape).strict();
}

export function assertRecipeSlotSchemas(
	kind: RecipeKind,
	slotSchemas: Partial<Record<RecipeSlot, z.ZodTypeAny>>,
): void {
	if (kind === 'single-step' && (slotSchemas.progress || slotSchemas.actions)) {
		throw new Error("Recipes with kind 'single-step' cannot declare progress or actions slots.");
	}
	if (kind === 'wizard' && !slotSchemas.actions) {
		throw new Error("Recipes with kind 'wizard' must declare an actions slot.");
	}
}

/**
 * Declares a recipe's `$type`, kind, slot schemas, and metadata.
 *
 * Single-step recipes cannot declare `progress` or `actions`. Wizard recipes
 * must declare `actions`. Built-in specs are exported from this module.
 */
export function defineRecipeSpec<const TType extends string, TSchema extends z.ZodTypeAny>(definition: {
	$type: TType;
	kind: RecipeKind;
	metadata: RecipeSpec<TType>['metadata'];
	slotSchemas?: Partial<Record<RecipeSlot, z.ZodTypeAny>>;
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
