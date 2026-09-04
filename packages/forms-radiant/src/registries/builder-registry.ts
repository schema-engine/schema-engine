import { FormComposer } from '@schema-engine/forms/builder';
import { radiantRecipes } from '@/recipes/bind-recipes';

/**
 * Factory for a Radiant form composer with canonical view recipes already bound.
 *
 * Radiant has no shadcn registry, so shells and step blocks ship in this
 * package. Specs remain in `@schema-engine/forms/recipes`. Register elements
 * explicitly; recipes are already on the composer.
 */
export function createRadiantFormComposer() {
	return new FormComposer().addRecipes([...radiantRecipes]);
}
