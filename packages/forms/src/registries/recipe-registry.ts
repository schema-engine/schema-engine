import type { AnyRecipeRegistration } from '@/types/registration';
import { BaseRegistry } from '@schema-engine/registry';
import { ComponentType } from '@/engine/component-type';

/**
 * Recipe Registry
 *
 * Manages registration and retrieval of form view recipes.
 */
export class RecipeRegistry extends BaseRegistry<string, AnyRecipeRegistration> {
	get registryName(): string {
		return ComponentType.Recipe;
	}
}
