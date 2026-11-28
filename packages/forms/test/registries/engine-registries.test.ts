import { afterEach, describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { parseActions } from '@schema-engine/actions';
import { safeParseNode } from '@schema-engine/registry';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';
import { defineInput } from '@/types';
import type { BuilderActionRegistration, BuilderActionRuntimeContext } from '@/types';
import { anyValue } from '../lib/any-value';

const noteSchema = z.object({ $type: z.literal('note'), id: z.string(), name: z.string() });

const noteElement = defineInput({
	value: anyValue,
	$type: 'note',
	schema: noteSchema,
	metadata: { name: 'Note', category: 'input' },
	render: () => null,
});

const cardRecipe = defineFormRecipe(
	defineRecipeSpec({
		$type: 'card',
		kind: 'single-step',
		metadata: { name: 'Card' },
		slotSchemas: { shell: z.strictObject({}) },
	}),
	{},
);

const logActionSchema = z.object({ id: z.string(), $type: z.literal('log') });

const logAction: BuilderActionRegistration<'log', typeof logActionSchema> = {
	$type: 'log',
	schema: logActionSchema,
	metadata: { name: 'Log', defaultTriggers: ['form_submit'] },
	execute: async () => ({ success: true }),
};

const invalidRecipe = { ...cardRecipe, slots: ['shell', 'progress'] };
const validRecipe = { ...cardRecipe, metadata: { name: 'Valid card' } };

describe('engine registries', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Scenario: Last registration wins without a warning', () => {
		test.each(['debug', 'info', 'log', 'warn', 'error'] as const)('logs no override on console.%s', (level) => {
			const spy = vi.spyOn(console, level).mockImplementation(() => undefined);
			const override = defineInput({
				value: anyValue,
				$type: 'note',
				schema: noteSchema,
				metadata: { name: 'Override', category: 'input' },
				render: () => null,
			});

			const engine = createFormEngine({
				elements: [noteElement, override],
				recipes: [cardRecipe, cardRecipe],
				actions: [logAction, logAction],
			});

			expect(engine.elements.get('note')?.metadata.name).toBe('Override');
			expect(engine.elements.all()).toHaveLength(1);
			expect(JSON.stringify(spy.mock.calls)).not.toContain('Overriding');
		});
	});

	describe('Scenario: A registration without a Standard Schema is rejected at build', () => {
		test('names the element $type', () => {
			const broken = { $type: 'broken', schema: {}, metadata: { name: 'Broken' }, render: () => null };

			expect(() => createFormEngine({ elements: [broken as never] })).toThrow(
				/Element 'broken' schema must implement Standard Schema/,
			);
		});

		test('names the recipe $type', () => {
			const recipe = { ...cardRecipe, $type: 'broken-recipe', schema: {} };

			expect(() => createFormEngine({ recipes: [recipe as never] })).toThrow(
				/Recipe 'broken-recipe' schema must implement Standard Schema/,
			);
		});

		test('names the action $type', () => {
			const action = { ...logAction, $type: 'broken-action', schema: {} };

			expect(() => createFormEngine({ actions: [action as never] })).toThrow(
				/Action 'broken-action' schema must implement Standard Schema/,
			);
		});
	});

	describe('Scenario: The built registry cannot change', () => {
		test('freezes the registrations the engine stores', () => {
			const engine = createFormEngine({ elements: [noteElement], recipes: [cardRecipe], actions: [logAction] });

			expect(Object.isFrozen(engine.elements.get('note'))).toBe(true);
			expect(Object.isFrozen(engine.recipes.get('card'))).toBe(true);
			expect(Object.isFrozen(engine.actions.get('log'))).toBe(true);
		});

		test('leaves the registrations it was given assignable, but the engine uses its build-time snapshot', async () => {
			const action: BuilderActionRegistration<'log', typeof logActionSchema> = {
				...logAction,
				execute: async () => ({ success: true }),
			};
			const engine = createFormEngine({ actions: [action] });
			const context = {} as BuilderActionRuntimeContext<z.output<typeof logActionSchema>>;

			expect(Object.isFrozen(action)).toBe(false);
			const spy = vi.spyOn(action, 'execute');
			action.metadata = { name: 'Renamed', defaultTriggers: ['form_submit'] };

			await engine.actions.get('log')?.execute(context);
			expect(spy).not.toHaveBeenCalled();
			expect(engine.actions.get('log')?.metadata.name).toBe('Log');
		});

		test('uses a spy installed before the engine is built', async () => {
			const action: BuilderActionRegistration<'log', typeof logActionSchema> = {
				...logAction,
				execute: async () => ({ success: true }),
			};
			const spy = vi.spyOn(action, 'execute');
			const engine = createFormEngine({ actions: [action] });

			await engine.actions
				.get('log')
				?.execute({} as BuilderActionRuntimeContext<z.output<typeof logActionSchema>>);

			expect(spy).toHaveBeenCalledTimes(1);
		});

		test('keeps an extended engine independent of the one it extends', () => {
			const base = createFormEngine({ elements: [noteElement] });
			const extended = base.extend({ actions: [logAction] });

			expect(base.actions.has('log')).toBe(false);
			expect(extended.actions.has('log')).toBe(true);
			expect(extended.elements.has('note')).toBe(true);
		});
	});

	describe('Recipes are checked as winners only', () => {
		test('an invalid recipe on its own fails the engine build', () => {
			expect(() => createFormEngine({ recipes: [invalidRecipe as never] })).toThrow(
				/cannot declare a progress slot/,
			);
		});

		test('the same recipe overridden later by a valid one builds', () => {
			const engine = createFormEngine({ recipes: [invalidRecipe as never, validRecipe] });

			expect(engine.recipes.get('card')?.metadata.name).toBe('Valid card');
		});

		test('an overridden recipe with a non-Standard Schema schema builds', () => {
			const engine = createFormEngine({ recipes: [{ ...cardRecipe, schema: {} } as never, validRecipe] });

			expect(engine.recipes.keys()).toEqual(['card']);
		});
	});

	describe('Scenario: The engine exposes its registries as properties', () => {
		const engine = createFormEngine({ elements: [noteElement], recipes: [cardRecipe], actions: [logAction] });

		test('each is a read-only registry with its kind', () => {
			expect([engine.elements.kind, engine.recipes.kind, engine.actions.kind, engine.validations.kind]).toEqual([
				'Element',
				'Recipe',
				'Action',
				'Validation',
			]);
			expect(engine.elements.keys()).toEqual(['note']);
			expect(engine.recipes.has('card')).toBe(true);
			expect(engine.actions.get('log')?.metadata.name).toBe('Log');
		});

		test('all() and keys() return frozen arrays', () => {
			expect(Object.isFrozen(engine.elements.all())).toBe(true);
			expect(Object.isFrozen(engine.recipes.keys())).toBe(true);
			expect(Object.isFrozen(engine.actions.all())).toBe(true);
		});

		test('each carries the hint of an unregistered $type, so a lookup reports where to register it', () => {
			expect(engine.elements.hint).toBe('Register it with createFormEngine({ elements: [...] }).');
			expect(engine.recipes.hint).toBe('Register it with createFormEngine({ recipes: [...] }).');
			expect(parseActions(engine.actions, [{ id: 'a', $type: 'missing' }])).toMatchObject({
				success: false,
				issues: [
					{
						message:
							"No registration for $type 'missing'. Register it with createFormEngine({ actions: [...] }).",
					},
				],
			});
			expect(safeParseNode(engine.elements, { $type: 'missing' })).toMatchObject({
				success: false,
				issues: [
					{
						message:
							"No registration for $type 'missing'. Register it with createFormEngine({ elements: [...] }).",
					},
				],
			});
		});

		test.each([
			'getElement',
			'getAllElements',
			'getElementIds',
			'hasElement',
			'getRecipe',
			'getAllRecipes',
			'getRecipeIds',
			'hasRecipe',
			'getAction',
			'getAllActions',
			'getActionTypes',
			'hasAction',
			'getValidationRegistry',
		])('has no %s method', (name) => {
			expect(engine).not.toHaveProperty(name);
		});
	});
});
