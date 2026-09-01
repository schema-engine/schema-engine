import { FormComposer } from '@schema-engine/forms/builder';
import { radiantRecipes } from '@/recipes/bind-recipes';

export function createRadiantFormComposer() {
	return new FormComposer().addRecipes([...radiantRecipes]);
}
