import { createFormEngine } from '@/engine/create-form-engine';
import type { FormEngine } from '@/engine/form-engine';
import type { NormalizedElementConfig, NormalizedFormConfig } from '@/lib/normalized-form-config';
import type { FormConfig } from '@/schemas/form-config';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';
import { defineInput } from '@/types';
import * as z from 'zod/mini';

type Assert<T extends true> = T;

const noteSchema = z.object({
	$type: z.literal('note'),
	id: z.string(),
	name: z.string(),
});

const noteElement = defineInput({
	$type: 'note',
	schema: noteSchema,
	metadata: { name: 'Note', category: 'input' },
	render: () => null,
});

const cardSchema = z.object({
	$type: z.literal('card'),
	header: z._default(z.object({ title: z._default(z.string(), 'Untitled') }), { title: 'Untitled' }),
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

const engine = createFormEngine({ elements: [noteElement], recipes: [cardRecipe] });

type EngineElements = typeof engine extends FormEngine<infer E, infer _R, infer _A> ? E : never;
type EngineRecipes = typeof engine extends FormEngine<infer _E, infer R, infer _A> ? R : never;
type _noteIsRegistered = Assert<'note' extends keyof EngineElements ? true : false>;
type _onlyNote = Assert<keyof EngineElements extends 'note' ? true : false>;
type _cardIsRegistered = Assert<'card' extends keyof EngineRecipes ? true : false>;
type _onlyCard = Assert<keyof EngineRecipes extends 'card' ? true : false>;

const defined = engine.defineForm({
	id: 'ok',
	view: { $type: 'card' },
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'note', id: 'n1', name: 'n1' }] }],
});
type _defineFormReturnsNormalized = Assert<typeof defined extends NormalizedFormConfig ? true : false>;

const rawForm: FormConfig = {
	id: 'raw',
	steps: [{ id: 'main', title: 'Main', elements: [] }],
};
/* @ts-expect-error -- authoring FormConfig is not a normalized form */
const _rawForm: NormalizedFormConfig = rawForm;

/* @ts-expect-error -- normalized forms are readonly */
defined.id = 'no';
/* @ts-expect-error -- normalized forms are readonly */
defined.steps.push({ id: 'x', title: 'x', elements: [] });

const rawElement = { $type: 'note', id: 'n', name: 'n' };
/* @ts-expect-error -- authoring element is not normalized */
const _rawElement: NormalizedElementConfig = rawElement;

void rawForm;
void rawElement;
void _rawForm;
void _rawElement;

const bulkEngine = createFormEngine({ elements: [noteElement], recipes: [cardRecipe] });

bulkEngine.defineForm({
	id: 'bulk',
	view: { $type: 'card' },
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'note', id: 'n1', name: 'n1' }] }],
});

const noteRegistrations = [noteElement];
const arrayEngine = createFormEngine({ elements: noteRegistrations, recipes: [cardRecipe] });

arrayEngine.defineForm({
	id: 'array',
	view: { $type: 'card' },
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'note', id: 'n1', name: 'n1' }] }],
});

const extendedEngine = engine.extend({ elements: [noteElement] });
extendedEngine.defineForm({
	id: 'extended',
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
					/* @ts-expect-error -- unregistered $type is not in this engine's element union */
					$type: 'not-registered',
					id: 'x',
					name: 'x',
				},
			],
		},
	],
});

void engine;

const titledSchema = z.object({
	$type: z.literal('titled'),
	id: z.string(),
	name: z.string(),
	title: z._default(z.string(), 'Untitled'),
});

const titledElement = defineInput({
	$type: 'titled',
	schema: titledSchema,
	metadata: { name: 'Titled', category: 'input' },
	render: (props: { title: string }) => {
		const _outputTitle: string = props.title;
		void _outputTitle;
		return null;
	},
});

const titledEngine = createFormEngine({ elements: [titledElement] });
titledEngine.defineForm({
	id: 'defaults',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [{ $type: 'titled', id: 't1', name: 't1' }],
		},
	],
});

const groupSchema = z.object({
	$type: z.literal('group'),
	id: z.string(),
	name: z.string(),
	elements: z.array(z.looseObject({ $type: z.string() })).check(z.minLength(1)),
});

const groupElement = defineInput({
	$type: 'group',
	schema: groupSchema,
	metadata: { name: 'Group', category: 'input' },
	render: () => null,
});

const nestedEngine = createFormEngine({ elements: [noteElement, groupElement] });
nestedEngine.defineForm({
	id: 'nested',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{
					$type: 'group',
					id: 'g1',
					name: 'g1',
					elements: [
						{ $type: 'note', id: 'n1', name: 'n1' },
						{
							/* @ts-expect-error -- nested children use this engine's registrations */
							$type: 'not-registered',
							id: 'x',
							name: 'x',
						},
					],
				},
			],
		},
	],
});

const firstNote = defineInput({
	$type: 'note',
	schema: noteSchema,
	metadata: { name: 'First', category: 'input' },
	render: () => null,
});
const overrideNote = defineInput({
	$type: 'note',
	schema: z.object({
		$type: z.literal('note'),
		id: z.string(),
		name: z.string(),
		hint: z.string(),
	}),
	metadata: { name: 'Override', category: 'input' },
	render: () => null,
});

const lastWinsEngine = createFormEngine({ elements: [firstNote, overrideNote] });
lastWinsEngine.defineForm({
	id: 'last-wins',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{ $type: 'note', id: 'n1', name: 'n1', hint: 'required by last registration' },
				/* @ts-expect-error -- tuple last-wins typing requires the last schema's hint */
				{ $type: 'note', id: 'n2', name: 'n2' },
			],
		},
	],
});

const openNoteRegistrations = [firstNote, overrideNote];
const unionEngine = createFormEngine({ elements: openNoteRegistrations });
unionEngine.defineForm({
	id: 'union',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{ $type: 'note', id: 'n1', name: 'n1' },
				{ $type: 'note', id: 'n2', name: 'n2', hint: 'allowed by union' },
			],
		},
	],
});

const pingSchema = z.object({
	id: z.string(),
	$type: z.literal('ping'),
	endpoint: z.string(),
});

const pingAction = {
	$type: 'ping' as const,
	schema: pingSchema,
	metadata: { name: 'Ping' },
	execute: async () => ({ success: true }),
};

const actionEngine = createFormEngine({ elements: [noteElement], actions: [pingAction] });
actionEngine.defineForm({
	id: 'actions-ok',
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'note', id: 'n1', name: 'n1' }] }],
	actions: [{ $type: 'ping', id: 'a1', endpoint: '/ping' }],
});

actionEngine.defineForm({
	id: 'actions-missing-type',
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'note', id: 'n1', name: 'n1' }] }],
	actions: [
		/* @ts-expect-error -- $type is required to discriminate the action union */
		{ id: 'a1', endpoint: '/ping' },
	],
});

actionEngine.defineForm({
	id: 'actions-unregistered',
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'note', id: 'n1', name: 'n1' }] }],
	actions: [
		{
			/* @ts-expect-error -- unregistered $type is not in this engine's action union */
			$type: 'not-registered',
			id: 'a1',
			endpoint: '/ping',
		},
	],
});

actionEngine.defineForm({
	id: 'actions-missing-field',
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'note', id: 'n1', name: 'n1' }] }],
	actions: [
		/* @ts-expect-error -- ping requires endpoint */
		{ $type: 'ping', id: 'a1' },
	],
});
