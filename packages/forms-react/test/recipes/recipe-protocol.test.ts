import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { validateRegistrationConfig } from '@schema-engine/forms/lib/standard-schema';
import { defineFormRecipe, defineRecipeSpec } from '@schema-engine/forms/recipes';
import { builtInRecipes } from '@/recipes';

describe('recipe protocol', () => {
	test('ships built-in recipes with kind constraints', () => {
		const types = builtInRecipes.map((recipe) => recipe.$type);
		expect(types).toContain('card');
		expect(types).toContain('card-wizard');
		expect(types).toContain('bare-controls');
		expect(types).toContain('wizard');
	});

	test('bound recipes reuse canonical slot schemas', () => {
		const recipe = defineFormRecipe(
			defineRecipeSpec({
				$type: 'brand',
				kind: 'single-step',
				metadata: { name: 'Brand', description: 'Brand shell' },
				slotSchemas: {
					shell: z.object({ accent: z.string().optional() }).strict(),
					header: z.object({ size: z.enum(['sm', 'md']).optional() }).strict(),
				},
			}),
			{ shell: () => null, slots: {} },
		);

		expect(() =>
			validateRegistrationConfig(recipe.schema, { $type: 'brand', shell: { accent: '#111' } }),
		).not.toThrow();
	});
});
