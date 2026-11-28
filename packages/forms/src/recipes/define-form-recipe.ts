import type { StandardSchemaV1 } from '@standard-schema/spec';
import { bindRecipe } from '@schema-engine/layout';
import type { RecipeRegistration } from '../types/index.js';
import type { RecipeSlotSchemas, RecipeSpec } from './types.js';

/**
 * Binds a recipe spec to a framework render payload (shell and slot components).
 *
 * Specs are canonical in this package. React implementations typically come
 * from the Schema Engine registry; Radiant binds its own payload in-package.
 */
export function defineFormRecipe<
	const TType extends string,
	TSlots extends RecipeSlotSchemas,
	TSchema extends StandardSchemaV1,
	TRender,
>(spec: RecipeSpec<TType, TSchema, TSlots>, render: TRender): RecipeRegistration<TType, TSchema, TRender> {
	return bindRecipe(spec, render) as RecipeRegistration<TType, TSchema, TRender>;
}
