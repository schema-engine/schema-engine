import { defineFormRecipe, type RecipeSlotSchemas, type RecipeSpec } from '@schema-engine/forms/recipes';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { RadiantRecipePayload } from './types.js';

/**
 * Binds a recipe spec to Radiant components, requiring exactly the slots the spec declares.
 *
 * @remarks
 * Declared apart from the built-in recipes so that importing it loads none of their shells and blocks.
 */
export function defineRecipe<
	const TType extends string,
	TSlots extends RecipeSlotSchemas,
	TSchema extends StandardSchemaV1,
>(spec: RecipeSpec<TType, TSchema, TSlots>, payload: RadiantRecipePayload<TSlots>) {
	return defineFormRecipe(spec, payload);
}
