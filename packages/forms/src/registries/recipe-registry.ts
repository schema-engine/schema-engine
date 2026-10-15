import type { AnyRecipeRegistration } from '@/types/registration';
import { BaseRegistry } from '@schema-engine/registry';
import { ComponentType } from '@/engine/component-type';
import type { RecipeKind, RecipeMetadata, RecipeSlot } from '@/recipes/types';
import { assertStandardSchema } from '@/lib/standard-schema';

/**
 * Recipe Registry
 *
 * Manages registration and retrieval of form view recipes.
 */
export class RecipeRegistry extends BaseRegistry<string, AnyRecipeRegistration> {
	get registryName(): string {
		return ComponentType.Recipe;
	}

	override register(item: {
		$type: string;
		schema: unknown;
		kind: RecipeKind;
		slots: RecipeSlot[];
		metadata: RecipeMetadata;
		render: unknown;
		slotDefaults?: AnyRecipeRegistration['slotDefaults'];
	}): void {
		assertStandardSchema(item.schema, `Recipe '${item.$type}' schema`);
		super.register(item as AnyRecipeRegistration);
	}
}
