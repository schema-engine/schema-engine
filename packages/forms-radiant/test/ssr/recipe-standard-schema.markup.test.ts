import { expect, test } from 'vitest';
import * as v from 'valibot';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { renderToString } from '@ecopages/jsx/server';
import { createFormEngine } from '@schema-engine/forms';
import { defineRecipeSpec } from '@schema-engine/forms/recipes';
import { StepHeaderBlock } from '@/components/blocks';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { defineRecipe } from '@/recipes';

const HeaderSchema = v.object({
	align: v.optional(v.picklist(['start', 'center']), 'start'),
	size: v.optional(v.picklist(['sm', 'md', 'lg']), 'md'),
});

const recipe = defineRecipe(
	defineRecipeSpec({
		$type: 'valibot-header',
		kind: 'single-step',
		metadata: { name: 'Valibot header', description: 'A header block whose config is a Valibot schema' },
		slotSchemas: { header: HeaderSchema },
	}),
	{ slots: { header: StepHeaderBlock } },
);

const engine = createFormEngine({ recipes: [recipe] });
const render = (view: Record<string, unknown>) => {
	const config = engine.validateForm({
		id: 'valibot-form',
		view: { $type: 'valibot-header', ...view },
		steps: [{ id: 'one', title: 'One', elements: [] }],
	});
	return withRadiantServerCustomElementRenderBridge(() =>
		renderToString(RecipeRenderer({ config, engine, recipe: engine.recipes.get('valibot-header') }), {
			mode: 'plain',
		}),
	);
};

/** The `slot-config` attribute of the header block as the markup carries it. */
function slotConfigOf(html: string): unknown {
	const attribute = html.match(/<se-step-header[^>]*slot-config="([^"]*)"/)?.[1] ?? '';
	return JSON.parse(attribute.replaceAll('&quot;', '"'));
}

test('the slot config the Valibot schema parsed reaches the block markup', () => {
	expect(slotConfigOf(render({ header: { align: 'center' } }))).toEqual({ align: 'center', size: 'md' });
});

test('an omitted slot renders the schema defaults', () => {
	expect(slotConfigOf(render({}))).toEqual({ align: 'start', size: 'md' });
});
