import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';
import { defineInput } from '@/types';
import { createZodSchemaFromRules, getValidationRulesForElement, validationRegistry } from '@/schemas/validation';

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
				slotSchemas: { shell: z.strictObject({}) },
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

	test('registers element validations onto the shared validation registry', () => {
		const phoneElement = defineInput({
			$type: 'phone-input',
			schema: z.object({
				$type: z.literal('phone-input'),
				name: z.string(),
				id: z.optional(z.string()),
			}),
			metadata: { name: 'Phone', category: 'input' },
			render: () => null,
			validations: [
				{
					type: 'phone',
					category: 'string',
					defaultFor: ['phone-input'],
					handler: (rule: { message?: string }) =>
						z.optional(z.string()).check(
							z.refine((value) => value === undefined || value === '' || value.endsWith('complete'), {
								message: rule.message || 'Enter a complete phone number',
							}),
						),
				},
			],
		});

		try {
			createFormEngine({ elements: [phoneElement] });

			expect(validationRegistry.has('phone')).toBe(true);
			expect(getValidationRulesForElement({ $type: 'phone-input' })).toEqual([{ type: 'phone' }]);
			expect(
				getValidationRulesForElement({
					$type: 'phone-input',
					rules: [{ type: 'phone', message: 'Use a complete number' }],
				}),
			).toEqual([{ type: 'phone', message: 'Use a complete number' }]);

			const schema = createZodSchemaFromRules([{ type: 'phone' }]);
			expect(schema.safeParse('+44').success).toBe(false);
			expect(schema.safeParse('+44-complete').success).toBe(true);
		} finally {
			validationRegistry.unregister('phone');
		}
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
