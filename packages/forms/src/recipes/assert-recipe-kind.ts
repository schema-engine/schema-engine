import type { RecipeKind } from './types';

/**
 * Enforces the slot rules of each recipe kind: single-step recipes cannot declare `progress`,
 * wizard recipes must declare `actions`.
 *
 * @remarks
 * Runs in `defineRecipeSpec` for an early failure and in `buildFormEngine` for every
 * registration, including hand-written ones with a non-Zod schema.
 */
export function assertRecipeKindSlots(recipe: {
	readonly $type: string;
	readonly kind: RecipeKind;
	readonly slots: readonly string[];
}): void {
	if (recipe.kind === 'single-step' && recipe.slots.includes('progress')) {
		throw new Error(`Recipe '${recipe.$type}' has kind 'single-step' and cannot declare a progress slot.`);
	}
	if (recipe.kind === 'wizard' && !recipe.slots.includes('actions')) {
		throw new Error(`Recipe '${recipe.$type}' has kind 'wizard' and must declare an actions slot.`);
	}
}
