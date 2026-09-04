import type { BuiltInRecipeRegistry } from '@schema-engine/forms/recipes';

declare global {
	namespace FormEngine {
		interface RecipeRegistry extends BuiltInRecipeRegistry {}
	}
}

export type { BuiltInRecipeRegistry };
