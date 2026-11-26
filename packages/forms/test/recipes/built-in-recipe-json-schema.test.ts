import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineFormRecipe } from '@/recipes/define-form-recipe';
import { builtInRecipeSpecs } from '@/recipes/built-in-specs';

const fixtureUrl = new URL('./fixtures/built-in-recipes.json', import.meta.url);

function describeBuiltInRecipes(): unknown {
	const engine = createFormEngine({
		recipes: [
			defineFormRecipe(builtInRecipeSpecs.card, null),
			defineFormRecipe(builtInRecipeSpecs['split-screen'], null),
			defineFormRecipe(builtInRecipeSpecs['hero-background'], null),
			defineFormRecipe(builtInRecipeSpecs['bare-controls'], null),
			defineFormRecipe(builtInRecipeSpecs['card-wizard'], null),
			defineFormRecipe(builtInRecipeSpecs.wizard, null),
			defineFormRecipe(builtInRecipeSpecs['sidebar-wizard'], null),
			defineFormRecipe(builtInRecipeSpecs['hero-wizard'], null),
			defineFormRecipe(builtInRecipeSpecs['split-screen-wizard'], null),
		],
	});
	return JSON.parse(
		JSON.stringify({
			jsonSchemaCollection: engine.generateJSONSchemaCollection(),
			viewCatalog: engine.describeViewCatalog(),
		}),
	);
}

/**
 * Pins the JSON Schema export of the nine built-in recipes: a change to how a recipe's view schema is built must
 * leave the export byte-identical. Regenerate with `UPDATE_RECIPE_FIXTURE=1` only for a change meant to move it.
 */
describe('built-in recipe JSON Schema export', () => {
	test('lists the nine built-in recipes', () => {
		expect(Object.keys(builtInRecipeSpecs)).toHaveLength(9);
	});

	test('matches the committed fixture', () => {
		const actual = describeBuiltInRecipes();
		if (process.env.UPDATE_RECIPE_FIXTURE === '1') {
			writeFileSync(fixtureUrl, `${JSON.stringify(actual, null, '\t')}\n`);
		}
		expect(actual).toEqual(JSON.parse(readFileSync(fixtureUrl, 'utf8')));
	});
});
