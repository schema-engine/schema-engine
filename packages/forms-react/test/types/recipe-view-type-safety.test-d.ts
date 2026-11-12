/**
 * Compile-time checks that a registry recipe's slot config types the form `view`.
 * Run via: pnpm check-types (tsconfig.test-types.json)
 */

import { createFormEngine } from '@schema-engine/forms';

import { CardRecipe } from '@/components/schema-engine/forms/recipes/registrations';

const engine = createFormEngine({ recipes: [CardRecipe] });
const steps = [{ id: 'main', title: 'Main', elements: [] }];

engine.defineForm({
	id: 'valid',
	steps,
	view: { $type: 'card', shell: { maxWidth: 'md' } },
});

engine.defineForm({
	id: 'invalid-value',
	steps,
	view: {
		$type: 'card',
		// @ts-expect-error -- maxWidth only accepts the shell's size tokens
		shell: { maxWidth: 'huge' },
	},
});

engine.defineForm({
	id: 'unknown-slot',
	steps,
	/* @ts-expect-error -- card declares no progress slot */
	view: { $type: 'card', progress: {} },
});
