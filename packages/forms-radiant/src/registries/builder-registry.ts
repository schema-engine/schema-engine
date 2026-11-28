import {
	createFormEngine,
	type CreateFormEngineOptions,
	type ElementRegistrationConstraint,
	type RecipeRegistrationConstraint,
	type ActionRegistrationConstraint,
} from '@schema-engine/forms';
import type { LayoutInput } from '@schema-engine/layout';
import { radiantRecipes } from '../recipes/bind-recipes.js';

/**
 * Factory for a Radiant form engine with canonical view recipes already bound.
 *
 * Radiant has no shadcn registry, so shells and step blocks ship in this
 * package. Specs remain in `@schema-engine/forms/recipes/built-in`. Register elements
 * explicitly; caller recipes are appended so same-`$type` overrides last-win.
 */
export function createRadiantFormEngine<
	const TElements extends readonly ElementRegistrationConstraint[] = readonly [],
	const TRecipes extends readonly RecipeRegistrationConstraint[] = readonly [],
	const TActions extends readonly ActionRegistrationConstraint[] = readonly [],
	const TLayout extends LayoutInput = Record<never, never>,
>(options?: CreateFormEngineOptions<TElements, TRecipes, TActions, TLayout>) {
	return createFormEngine({
		...options,
		recipes: [...radiantRecipes, ...(options?.recipes ?? [])] as const,
	});
}
