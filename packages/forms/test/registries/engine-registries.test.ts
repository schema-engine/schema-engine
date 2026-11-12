import { afterEach, describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';
import { defineInput } from '@/types';
import type { BuilderActionRegistration } from '@/types';

const noteSchema = z.object({ $type: z.literal('note'), id: z.string(), name: z.string() });

const noteElement = defineInput({
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

			expect(engine.getElement('note')?.metadata.name).toBe('Override');
			expect(engine.getAllElements()).toHaveLength(1);
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

			expect(Object.isFrozen(engine.getElement('note'))).toBe(true);
			expect(Object.isFrozen(engine.getRecipe('card'))).toBe(true);
			expect(Object.isFrozen(engine.getAction('log'))).toBe(true);
		});

		test('leaves the registrations it was given spy-able and assignable', () => {
			const action: BuilderActionRegistration<'log', typeof logActionSchema> = {
				...logAction,
				execute: async () => ({ success: true }),
			};

			createFormEngine({ actions: [action] });

			expect(Object.isFrozen(action)).toBe(false);
			const spy = vi.spyOn(action, 'execute');
			expect(spy).toBeDefined();
			action.metadata = { name: 'Renamed', defaultTriggers: ['form_submit'] };
			expect(action.metadata.name).toBe('Renamed');
		});

		test('keeps an extended engine independent of the one it extends', () => {
			const base = createFormEngine({ elements: [noteElement] });
			const extended = base.extend({ actions: [logAction] });

			expect(base.hasAction('log')).toBe(false);
			expect(extended.hasAction('log')).toBe(true);
			expect(extended.hasElement('note')).toBe(true);
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

			expect(engine.getRecipe('card')?.metadata.name).toBe('Valid card');
		});

		test('an overridden recipe with a non-Standard Schema schema builds', () => {
			const engine = createFormEngine({ recipes: [{ ...cardRecipe, schema: {} } as never, validRecipe] });

			expect(engine.getRecipeIds()).toEqual(['card']);
		});
	});
});
