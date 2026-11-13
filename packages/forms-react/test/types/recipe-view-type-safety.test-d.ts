/**
 * Compile-time checks that a registry recipe's slot config types the form `view`.
 * Run via: pnpm check-types (tsconfig.test-types.json)
 */

import { createFormEngine } from '@schema-engine/forms';

import { CardRecipe, WizardRecipe } from '@/components/schema-engine/forms/recipes/registrations';

const engine = createFormEngine({ recipes: [CardRecipe] });
const steps = [{ id: 'main', title: 'Main', elements: [] }];

engine.defineForm({
	id: 'valid',
	steps,
	view: { $type: 'card', shell: { appearance: { size: 'default' } } },
});

engine.defineForm({
	id: 'invalid-value',
	steps,
	view: {
		$type: 'card',
		// @ts-expect-error -- the shell takes appearance, not the removed maxWidth
		shell: { maxWidth: 'huge' },
	},
});

engine.defineForm({
	id: 'unknown-slot',
	steps,
	/* @ts-expect-error -- card declares no progress slot */
	view: { $type: 'card', progress: {} },
});

engine.defineForm({
	id: 'unknown-slot-key',
	steps,
	view: {
		$type: 'card',
		// @ts-expect-error -- card's shell declares no bogus key
		shell: { bogus: 1 },
	},
});

const multiEngine = createFormEngine({ recipes: [CardRecipe, WizardRecipe] });

multiEngine.defineForm({
	id: 'multi-valid',
	steps,
	view: { $type: 'wizard', progress: {} },
});

multiEngine.defineForm({
	id: 'multi-unknown-slot-key',
	steps,
	view: {
		$type: 'card',
		// @ts-expect-error -- card's shell declares no bogus key, even with another recipe registered
		shell: { bogus: 1 },
	},
});

multiEngine.defineForm({
	id: 'multi-cross-recipe-slot',
	steps,
	/* @ts-expect-error -- card declares no progress slot, although wizard does */
	view: { $type: 'card', progress: {} },
});
