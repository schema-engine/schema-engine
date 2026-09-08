import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';
import { defineInput } from '@/types';

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

describe('createFormEngine', () => {
	test('creates an empty engine by default', () => {
		const engine = createFormEngine();
		expect(engine.getElementIds()).toEqual([]);
		expect(engine.getRecipeIds()).toEqual([]);
		expect(engine.getActionTypes()).toEqual([]);
	});

	test('registers elements, recipes, and actions from options', () => {
		const cardRecipe = defineFormRecipe(
			defineRecipeSpec({
				$type: 'card',
				kind: 'single-step',
				metadata: { name: 'Card' },
				slotSchemas: { shell: z.object({}) },
				schema: z.object({ $type: z.literal('card') }),
			}),
			{},
		);

		const engine = createFormEngine({
			elements: [noteElement],
			recipes: [cardRecipe],
		});

		expect(engine.hasElement('note')).toBe(true);
		expect(engine.hasRecipe('card')).toBe(true);
	});

	test('last registration wins for duplicate $type at runtime', () => {
		const first = defineInput({
			$type: 'note',
			schema: noteSchema,
			metadata: { name: 'First note', category: 'input' },
			render: () => null,
		});
		const second = defineInput({
			$type: 'note',
			schema: noteSchema,
			metadata: { name: 'Second note', category: 'input' },
			render: () => null,
		});

		const engine = createFormEngine({ elements: [first, second] });

		expect(engine.getElement('note')?.metadata.name).toBe('Second note');
	});
});

const textareaElement = defineInput({
	$type: 'textarea',
	schema: z.object({
		$type: z.literal('textarea'),
		id: z.string(),
		name: z.string(),
	}),
	metadata: { name: 'Textarea', category: 'input' },
	render: () => null,
});

describe('FormEngine.extend', () => {
	test('returns a new engine with merged registrations', () => {
		const base = createFormEngine({ elements: [noteElement] });
		const extended = base.extend({
			elements: [textareaElement],
		});

		expect(base.hasElement('textarea')).toBe(false);
		expect(extended.hasElement('note')).toBe(true);
		expect(extended.hasElement('textarea')).toBe(true);
	});
});
