import type { RecipeRegistration } from '@/types';
import { BaseRegistry } from '@schema-engine/registry';
import { ComponentType } from '@/engine/component-type';

/**
 * Recipe Registry
 *
 * Manages registration and retrieval of form view recipes.
 */
export class RecipeRegistry extends BaseRegistry<string, RecipeRegistration<any, any>> {
	get registryName(): string {
		return ComponentType.Recipe;
	}
}
