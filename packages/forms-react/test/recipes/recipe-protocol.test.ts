import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { validateRegistrationConfig } from '@schema-engine/forms/lib/standard-schema';
import { defineFormRecipe, defineRecipeSpec } from '@schema-engine/forms/recipes';
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes/registrations';

describe('recipe protocol', () => {
	test('registry-owned recipes use the canonical kind constraints', () => {
		const types = schemaFormRecipeRegistrations.map((recipe) => recipe.$type);
		expect(types).toHaveLength(9);
		expect(new Set(types)).toEqual(
			new Set([
				'card',
				'split-screen',
				'hero-background',
				'bare-controls',
				'card-wizard',
				'wizard',
				'sidebar-wizard',
				'hero-wizard',
				'split-screen-wizard',
			]),
		);
	});

	test('bound recipes reuse canonical slot schemas', () => {
		const recipe = defineFormRecipe(
			defineRecipeSpec({
				$type: 'brand',
				kind: 'single-step',
				metadata: { name: 'Brand', description: 'Brand shell' },
				slotSchemas: {
					shell: z.strictObject({ accent: z.optional(z.string()) }),
					header: z.strictObject({ size: z.optional(z.enum(['sm', 'md'])) }),
				},
			}),
			{ shell: () => null, slots: {} },
		);

		expect(() =>
			validateRegistrationConfig(recipe.schema, { $type: 'brand', shell: { accent: '#111' } }),
		).not.toThrow();
	});
});
