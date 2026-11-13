import { describe, expect, test } from 'vitest';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineFormRecipe } from '@/recipes/define-form-recipe';
import { defineRecipeSpec } from '@/recipes/define-recipe-spec';
import { DEFAULT_WIZARD_RECIPE } from '@/lib/form-view';
import { formRecipeProtocol } from '@/recipes/protocol';
import { cardSpec, wizardSpec } from '@/recipes/built-in-specs';

describe('the forms recipe protocol', () => {
	test('declares the four form slots in composition order and the two kinds', () => {
		expect(formRecipeProtocol.slots).toEqual(['shell', 'header', 'progress', 'actions']);
		expect(formRecipeProtocol.kinds).toEqual(['single-step', 'wizard']);
		expect(formRecipeProtocol.rules.map((rule) => rule.name)).toEqual([
			'single-step-has-no-progress',
			'wizard-has-actions',
		]);
	});

	test('lists the slots of a spec in protocol order', () => {
		expect(wizardSpec.slots).toEqual(['header', 'progress', 'actions']);
		expect(cardSpec.slots[0]).toBe('shell');

		const reversed = defineRecipeSpec({
			$type: 'reversed',
			kind: 'wizard',
			metadata: { name: 'Reversed' },
			slotSchemas: { actions: wizardSpec.slotSchemas.actions, header: wizardSpec.slotSchemas.header },
		});
		expect(reversed.slots).toEqual(['header', 'actions']);
	});

	test('names the recipe and the rule when a spec breaks a kind rule', () => {
		expect(() =>
			defineRecipeSpec({
				$type: 'actionless',
				kind: 'wizard',
				metadata: { name: 'Actionless' },
				slotSchemas: wizardSpecWithoutActions(),
			}),
		).toThrow(/Recipe 'actionless' breaks rule 'wizard-has-actions': kind 'wizard' must declare an actions slot/);
	});

	test('names the recipe and the rule when the engine builds a hand-written recipe that breaks a rule', () => {
		const invalid = { ...defineFormRecipe(cardSpec, {}), $type: 'odd-card', slots: ['progress' as const] };
		expect(() => createFormEngine({ recipes: [invalid] })).toThrow(
			/Recipe 'odd-card' breaks rule 'single-step-has-no-progress'/,
		);
	});

	test('rejects a default wizard recipe that is not registered', () => {
		expect(() =>
			createFormEngine({ recipes: [defineFormRecipe(cardSpec, {})], defaultWizardRecipe: 'gone' }),
		).toThrow(/defaultWizardRecipe 'gone' is not a registered recipe/);
	});

	test('checks the implicit default only when it is registered', () => {
		const bareControls = defineFormRecipe(wizardSpec, {});
		expect(() => createFormEngine({ recipes: [defineFormRecipe(cardSpec, {})] })).not.toThrow();
		expect(() => createFormEngine({ recipes: [{ ...bareControls, $type: DEFAULT_WIZARD_RECIPE }] })).not.toThrow();
		expect(() =>
			createFormEngine({ recipes: [{ ...defineFormRecipe(cardSpec, {}), $type: DEFAULT_WIZARD_RECIPE }] }),
		).toThrow(/defaultWizardRecipe 'bare-controls' has kind 'single-step'/);
	});

	test('rejects a default wizard recipe that is not a wizard', () => {
		expect(() =>
			createFormEngine({ recipes: [defineFormRecipe(cardSpec, {})], defaultWizardRecipe: 'card' }),
		).toThrow(/defaultWizardRecipe 'card' has kind 'single-step'; it must be a wizard recipe/);
	});
});

function wizardSpecWithoutActions() {
	const { header } = wizardSpec.slotSchemas;
	return { header };
}
