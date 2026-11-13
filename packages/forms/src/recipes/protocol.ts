import { createRecipeRegistry, defineRecipeProtocol, type KindOf, type SlotOf } from '@schema-engine/layout';
import type { ReadOnlyRegistry } from '@schema-engine/registry';
import { DEFAULT_WIZARD_RECIPE } from '@/lib/form-view';
import type { AnyRecipeRegistration } from '@/types/registration';

/**
 * The recipe protocol of forms: four slots, composed in this order, and two kinds.
 *
 * @remarks
 * A single-step recipe cannot declare `progress`; its `actions` slot is the submit-only bar. A
 * wizard recipe must declare `actions`. The rules run in `defineRecipeSpec` for an early failure
 * and in `buildFormEngine` for each winning registration (a recipe overridden later in the list is
 * skipped), including hand-written ones with a non-Zod schema.
 */
export const formRecipeProtocol = defineRecipeProtocol({
	slots: ['shell', 'header', 'progress', 'actions'],
	kinds: ['single-step', 'wizard'],
	rules: [
		{
			name: 'single-step-has-no-progress',
			check: (recipe) =>
				recipe.kind === 'single-step' && recipe.slots.includes('progress')
					? `kind 'single-step' cannot declare a progress slot`
					: undefined,
		},
		{
			name: 'wizard-has-actions',
			check: (recipe) =>
				recipe.kind === 'wizard' && !recipe.slots.includes('actions')
					? `kind 'wizard' must declare an actions slot`
					: undefined,
		},
	],
});

export type RecipeKind = KindOf<typeof formRecipeProtocol>;

export type RecipeSlot = SlotOf<typeof formRecipeProtocol>;

/** Builds the forms `Recipe` registry, running {@link formRecipeProtocol}'s rules on each winning registration. */
export function createFormRecipeRegistry(
	recipes: readonly AnyRecipeRegistration[],
): ReadOnlyRegistry<AnyRecipeRegistration> {
	return createRecipeRegistry(formRecipeProtocol, recipes);
}

/**
 * Checks the recipe a multi-step form without `view` falls back to.
 *
 * @param defaultWizardRecipe - The engine option; when omitted, {@link DEFAULT_WIZARD_RECIPE} is checked only if it is registered
 * @throws {Error} When the named recipe is not registered or is not a wizard
 */
export function assertDefaultWizardRecipe(
	recipes: ReadOnlyRegistry<AnyRecipeRegistration>,
	defaultWizardRecipe: string | undefined,
): void {
	const checked = defaultWizardRecipe ?? DEFAULT_WIZARD_RECIPE;
	if (defaultWizardRecipe === undefined && !recipes.has(checked)) return;
	const recipe = recipes.get(checked);
	if (!recipe) {
		throw new Error(
			`defaultWizardRecipe '${defaultWizardRecipe}' is not a registered recipe. Register it with createFormEngine({ recipes: [...] }).`,
		);
	}
	if (recipe.kind !== 'wizard') {
		throw new Error(`defaultWizardRecipe '${checked}' has kind '${recipe.kind}'; it must be a wizard recipe.`);
	}
}
