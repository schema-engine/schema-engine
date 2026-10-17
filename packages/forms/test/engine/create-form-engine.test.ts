import { SchemaMetadataCatalog } from '@/engine/schema-metadata-catalog';
import { ComponentType } from '@/engine/component-type';
import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';
import { defineInput } from '@/types';
import {
	createValidationContext,
	createZodSchemaFromRules,
	getValidationRulesForElement,
	type AnyValidationRegistration,
} from '@/schemas/validation';

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

	test('registers element validations on the engine validation registry', () => {
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

		const engine = createFormEngine({ elements: [phoneElement] });
		const registry = engine.getValidationRegistry();

		expect(registry.has('phone')).toBe(true);
		expect(getValidationRulesForElement({ $type: 'phone-input' }, registry)).toEqual([{ type: 'phone' }]);
		expect(
			getValidationRulesForElement(
				{
					$type: 'phone-input',
					rules: [{ type: 'phone', message: 'Use a complete number' }],
				},
				registry,
			),
		).toEqual([{ type: 'phone', message: 'Use a complete number' }]);

		const schema = createZodSchemaFromRules([{ type: 'phone' }], createValidationContext(), registry);
		expect(schema.safeParse('+44').success).toBe(false);
		expect(schema.safeParse('+44-complete').success).toBe(true);
	});

	test('does not leak element validations between engines', () => {
		const customValidation = {
			type: 'custom-leak-test',
			category: 'string',
			defaultFor: ['leak-input'],
			handler: () => z.string(),
		} satisfies AnyValidationRegistration;
		const leakElement = defineInput({
			$type: 'leak-input',
			schema: z.object({ $type: z.literal('leak-input'), name: z.string() }),
			metadata: { name: 'Leak', category: 'input' },
			render: () => null,
			validations: [customValidation],
		});
		const engineA = createFormEngine({ elements: [leakElement] });
		const engineB = createFormEngine({ elements: [] });

		expect(engineA.getValidationRegistry().has('custom-leak-test')).toBe(true);
		expect(engineB.getValidationRegistry().has('custom-leak-test')).toBe(false);
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

	test('preserves the grid theme and cached stylesheet', () => {
		const base = createFormEngine({
			elements: [noteElement],
			grid: { breakpoints: { md: '50rem' } },
		});
		const extended = base.extend({ elements: [textareaElement] });

		expect(extended.getGridTheme()).toBe(base.getGridTheme());
		expect(extended.getCompiledGrid()).toBe(base.getCompiledGrid());
		expect(extended.getCompiledGrid()).toBe(base.getCompiledGrid());
	});
});

test('extend preserves an explicitly supplied metadata catalog', () => {
	const catalog = new SchemaMetadataCatalog();
	const customSchema = z.object({ tag: z.string() });
	catalog.register(customSchema, {
		id: 'custom:metadata',
		title: 'Custom metadata',
		componentType: ComponentType.Element,
	});
	const engine = createFormEngine({ catalog });
	const before = engine.generateJSONSchemaCollection();
	expect(JSON.stringify(before)).toContain('custom:metadata');
	const extended = engine.extend({ elements: [noteElement] });
	const after = extended.generateJSONSchemaCollection();
	expect(extended.getSchemaCatalog()).not.toBe(catalog);
	expect(after.schemas).toHaveProperty('custom:metadata', before.schemas['custom:metadata']);
	expect(after.schemas).toHaveProperty('element:note');
	expect(catalog.getRegisteredSchemas()).toHaveLength(1);
	expect(extended.hasElement('note')).toBe(true);
});

test('extend replaces the catalog schema for an overridden registration', () => {
	const replacement = defineInput({
		$type: 'note',
		schema: z.object({ $type: z.literal('note'), id: z.string(), name: z.string(), revision: z.number() }),
		metadata: { name: 'Revised note', category: 'input' },
		render: () => null,
	});
	const base = createFormEngine({ elements: [noteElement] });
	const extended = base.extend({ elements: [replacement] });
	const schemas = extended.generateJSONSchemaCollection().schemas as Record<string, Record<string, unknown>>;

	expect(schemas['element:note'].properties).toHaveProperty('revision');
	expect(base.generateJSONSchemaCollection().schemas).toHaveProperty('element:note');
});

test('extend replaces the catalog title and description for an overridden registration', () => {
	const replacement = defineInput({
		$type: 'note',
		schema: noteSchema,
		metadata: { name: 'Revised note', description: 'A dated note', category: 'input' },
		render: () => null,
	});
	const base = createFormEngine({ elements: [noteElement] });
	const extended = base.extend({ elements: [replacement] });

	expect(extended.getSchemaCatalog().get('element:note')).toMatchObject({
		title: 'Revised note',
		description: 'A dated note',
	});
	expect(base.getSchemaCatalog().get('element:note')?.title).toBe('Note');
});
