import type { AnyRecipeRegistration } from '@/types/registration';
import { DEFAULT_WIZARD_RECIPE } from '@/lib/form-view';
import type { RecipeDescriptor, ViewCatalog } from '@/recipes/types';

function recipeToDescriptor(recipe: AnyRecipeRegistration, viewSchema?: Record<string, unknown>): RecipeDescriptor {
	return {
		$type: recipe.$type,
		kind: recipe.kind,
		slots: [...recipe.slots],
		metadata: recipe.metadata,
		viewSchema: viewSchema ?? {},
	};
}

export function describeRecipeFromRegistration(
	recipe: AnyRecipeRegistration,
	generateViewSchema?: (recipe: AnyRecipeRegistration) => Record<string, unknown>,
): RecipeDescriptor {
	return recipeToDescriptor(recipe, generateViewSchema?.(recipe));
}

export function describeViewCatalogFromRecipes(
	recipes: readonly AnyRecipeRegistration[],
	generateViewSchema?: (recipe: AnyRecipeRegistration) => Record<string, unknown>,
): ViewCatalog {
	return {
		recipes: recipes.map((recipe) => describeRecipeFromRegistration(recipe, generateViewSchema)),
		rules: {
			noViewSingleStep: 'Omit view for a single-step form to render fields only.',
			noViewMultiStep: `Omit view for a multi-step form and validateForm writes the engine's default wizard recipe as its view (${DEFAULT_WIZARD_RECIPE} unless createFormEngine({ defaultWizardRecipe }) names another). If that recipe is not registered, validateForm still succeeds and warns, then every step renders on a single page without chrome.`,
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
