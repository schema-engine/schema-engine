import { expect, test } from 'vitest';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { renderToString } from '@ecopages/jsx/server';
import { createFormEngine } from '@schema-engine/forms';
import { defineRecipeSpec } from '@schema-engine/forms/recipes';
import { StepHeaderConfigSchema, WizardActionsConfigSchema } from '@schema-engine/forms/recipes/built-in';
import { StepHeaderBlock, WizardActionsBlock } from '@/components/blocks';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { defineRecipe } from '@/recipes';

const recipe = defineRecipe(
	defineRecipeSpec({
		$type: 'blocks',
		kind: 'wizard',
		metadata: { name: 'Blocks', description: 'Header and actions blocks' },
		slotSchemas: { header: StepHeaderConfigSchema, actions: WizardActionsConfigSchema },
	}),
	{ slots: { header: StepHeaderBlock, actions: WizardActionsBlock } },
);

test('each block receives only its own slot config', () => {
	const engine = createFormEngine({ recipes: [recipe] });
	const config = engine.validateForm({
		id: 'blocks-form',
		view: { $type: 'blocks' },
		steps: [
			{ id: 'one', title: 'One', elements: [] },
			{ id: 'two', title: 'Two', elements: [] },
		],
	});

	const html = withRadiantServerCustomElementRenderBridge(() =>
		renderToString(RecipeRenderer({ config, engine, recipe: engine.recipes.get('blocks') }), { mode: 'plain' }),
	);

	const header = html.match(/<se-step-header[^>]*>/)?.[0] ?? '';
	const actions = html.match(/<se-wizard-actions[^>]*>/)?.[0] ?? '';
	expect(header).toContain('counterPlacement');
	expect(header).not.toContain('previousAriaLabel');
	expect(actions).toContain('previousAriaLabel');
	expect(actions).not.toContain('counterPlacement');
	expect(html).not.toContain('viewConfig');
});
