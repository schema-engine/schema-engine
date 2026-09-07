import type { RecipeRegistration } from '@/types';
import type { RecipeDescriptor, ViewCatalog } from '@/recipes/types';

function recipeToDescriptor(
	recipe: RecipeRegistration<any, any>,
	viewSchema?: Record<string, unknown>,
): RecipeDescriptor {
	return {
		$type: recipe.$type,
		kind: recipe.kind,
		slots: [...recipe.slots],
		metadata: recipe.metadata,
		viewSchema: viewSchema ?? {},
	};
}

export function describeRecipeFromRegistration(
	recipe: RecipeRegistration<any, any>,
	generateViewSchema?: (recipe: RecipeRegistration<any, any>) => Record<string, unknown>,
): RecipeDescriptor {
	return recipeToDescriptor(recipe, generateViewSchema?.(recipe));
}

export function describeViewCatalogFromRecipes(
	recipes: RecipeRegistration<any, any>[],
	generateViewSchema?: (recipe: RecipeRegistration<any, any>) => Record<string, unknown>,
): ViewCatalog {
	return {
		recipes: recipes.map((recipe) => describeRecipeFromRegistration(recipe, generateViewSchema)),
		rules: {
			noViewSingleStep: 'Omit view for a single-step form to render fields only.',
			noViewMultiStep:
				'Omit view for a multi-step form to use the registered default wizard recipe (bare-controls). If that recipe is not registered, validateForm still succeeds and render warns, then every step renders on a single page without chrome.',
			oneViewPerForm:
				'Each form has at most one view. Recipes are code-defined; forms select view.$type and pass slot config.',
		},
	};
}

export function getAuthoringInstructionsFromCatalog(catalog: ViewCatalog): string {
	const lines = [
		'# Schema Engine form authoring',
		'',
		'## Rules',
		`- ${catalog.rules.oneViewPerForm}`,
		`- ${catalog.rules.noViewSingleStep}`,
		`- ${catalog.rules.noViewMultiStep}`,
		'- Invalid view.$type, malformed slot config, or kind/step mismatch throws at validateForm and render.',
		'- content is engine-owned and never appears in view JSON.',
		'- Slot config has no $type; the recipe fixes block identity.',
		'',
		'## Registered recipes',
		'',
	];

	for (const recipe of catalog.recipes) {
		lines.push(`### ${recipe.$type} (${recipe.kind})`);
		lines.push(`- ${recipe.metadata.description}`);
		lines.push(`- Slots: ${recipe.slots.join(', ') || '(shell only)'}`);
		lines.push('');
	}

	return lines.join('\n');
}
