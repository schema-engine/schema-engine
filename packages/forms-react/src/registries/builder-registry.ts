import {
	createFormEngine,
	type CreateFormEngineOptions,
	type ElementRegistrationConstraint,
	type RecipeRegistrationConstraint,
	type ActionRegistrationConstraint,
} from '@schema-engine/forms';

/**
 * Factory for a React form engine with no default registrations.
 *
 * Headless means this factory does not bind default view recipes or form
 * elements. `FormRenderer` still lives in this package. Register elements and
 * recipes explicitly — typically `schemaFormRegistrations` and
 * `schemaFormRecipeRegistrations` from the Schema Engine shadcn registry.
 */
export function createReactFormEngine<
	const TElements extends readonly ElementRegistrationConstraint[] = readonly [],
	const TRecipes extends readonly RecipeRegistrationConstraint[] = readonly [],
	const TActions extends readonly ActionRegistrationConstraint[] = readonly [],
>(options?: CreateFormEngineOptions<TElements, TRecipes, TActions>) {
	return createFormEngine(options);
}
