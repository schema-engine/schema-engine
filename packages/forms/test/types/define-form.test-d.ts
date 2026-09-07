import { FormComposer } from '@/builder';
import type { FormEngine } from '@/engine/form-engine';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';
import { z } from 'zod';

type Assert<T extends true> = T;

const noteSchema = z.object({
	$type: z.literal('note'),
	id: z.string(),
	name: z.string(),
});

const noteElement = {
	$type: 'note' as const,
	schema: noteSchema,
	metadata: { name: 'Note', category: 'input' as const },
	render: () => null,
};

const cardSchema = z.object({
	$type: z.literal('card'),
	header: z.object({ title: z.string().default('Untitled') }).default({ title: 'Untitled' }),
});

const cardRecipe = defineFormRecipe(
	defineRecipeSpec({
		$type: 'card',
		kind: 'single-step',
		metadata: { name: 'Card' },
		slotSchemas: { header: z.object({ title: z.string() }) },
		schema: cardSchema,
	}),
	{},
);

const engine = new FormComposer().addElement(noteElement).addRecipe(cardRecipe).build();

type EngineElements = typeof engine extends FormEngine<infer E, infer _R, infer _A> ? E : never;
type EngineRecipes = typeof engine extends FormEngine<infer _E, infer R, infer _A> ? R : never;
type _noteIsRegistered = Assert<'note' extends keyof EngineElements ? true : false>;
type _onlyNote = Assert<keyof EngineElements extends 'note' ? true : false>;
type _cardIsRegistered = Assert<'card' extends keyof EngineRecipes ? true : false>;
type _onlyCard = Assert<keyof EngineRecipes extends 'card' ? true : false>;

engine.defineForm({
	id: 'ok',
	view: { $type: 'card' },
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'note', id: 'n1', name: 'n1' }] }],
});

engine.defineForm({
	id: 'bad',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{
					// @ts-expect-error -- unregistered $type is not in this engine's element union
					$type: 'not-registered',
					id: 'x',
					name: 'x',
				},
			],
		},
	],
});

void engine;
