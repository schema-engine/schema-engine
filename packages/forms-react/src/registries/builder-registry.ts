import { FormComposer } from '@schema-engine/forms/builder';
import { builtInRecipes } from '@/recipes/bind-recipes';

/**
 * Factory for a React form composer with the built-in view recipes registered.
 */
export function createReactFormComposer() {
	return new FormComposer().addRecipes([...builtInRecipes]);
}
