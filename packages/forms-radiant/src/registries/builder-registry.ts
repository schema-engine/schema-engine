import {
	createFormEngine,
	type CreateFormEngineOptions,
	type ElementRegistrationConstraint,
	type RecipeRegistrationConstraint,
	type ActionRegistrationConstraint,
} from '@schema-engine/forms';
import { radiantRecipes } from '@/recipes/bind-recipes';

/**
 * Factory for a Radiant form engine with canonical view recipes already bound.
 *
 * Radiant has no shadcn registry, so shells and step blocks ship in this
 * package. Specs remain in `@schema-engine/forms/recipes`. Register elements
 * explicitly; caller recipes are appended so same-`$type` overrides last-win.
 */
export function createRadiantFormEngine<
	const TElements extends readonly ElementRegistrationConstraint[] = readonly [],
	const TRecipes extends readonly RecipeRegistrationConstraint[] = readonly [],
	const TActions extends readonly ActionRegistrationConstraint[] = readonly [],
>(options?: CreateFormEngineOptions<TElements, TRecipes, TActions>) {
	return createFormEngine({
		...options,
		recipes: [...radiantRecipes, ...(options?.recipes ?? [])] as const,
	});
}
