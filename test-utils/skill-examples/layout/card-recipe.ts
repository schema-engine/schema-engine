import * as v from 'valibot';
import {
	bindRecipe,
	createRecipeRegistry,
	defineProtocolRecipeSpec,
	defineRecipeProtocol,
	getDefaultLayoutTheme,
	readSlotConfig,
	resolveRecipeView,
} from '@schema-engine/layout';

export const cardProtocol = defineRecipeProtocol({
	slots: ['shell', 'header', 'body', 'footer'],
	kinds: ['card'],
});

export const cardSpec = defineProtocolRecipeSpec(cardProtocol, {
	$type: 'card',
	kind: 'card',
	metadata: { name: 'Card' },
	slotSchemas: {
		shell: v.strictObject({ appearance: v.optional(v.record(v.string(), v.string())) }),
		header: v.strictObject({ level: v.optional(v.picklist([1, 2, 3, 4, 5, 6]), 2) }),
		body: v.strictObject({ gap: v.optional(v.picklist(['sm', 'md']), 'md') }),
		footer: v.strictObject({ align: v.optional(v.picklist(['start', 'end']), 'start') }),
	},
	slotDefaults: { header: { level: 3 } },
	appearanceAxes: { shell: ['size', 'surface'] },
});

export const recipes = createRecipeRegistry(cardProtocol, [bindRecipe(cardSpec, { tag: 'article' })]);

const recipe = recipes.get('card')!;
const scope = { axes: getDefaultLayoutTheme().axes, inherited: {} };

export const resolved = resolveRecipeView(
	recipe,
	{ $type: 'card', shell: { appearance: { surface: 'outlined' } }, footer: { align: 'end' } },
	scope,
);

export const undeclared = resolveRecipeView(recipe, { $type: 'card', aside: {} }, scope);

export const footer = resolved.view && readSlotConfig(resolved.view, 'footer', cardSpec.slotSchemas.footer);
