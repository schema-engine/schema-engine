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
	PhoneRuleSchema,
} from '@/schemas/validation';
import { anyValue } from '../lib/any-value';

const noteSchema = z.object({
	$type: z.literal('note'),
	id: z.string(),
	name: z.string(),
});

const noteElement = defineInput({
	value: anyValue,
	$type: 'note',
	schema: noteSchema,
	metadata: { name: 'Note', category: 'input' },
	render: () => null,
});

describe('createFormEngine', () => {
	test('creates an empty engine by default', () => {
		const engine = createFormEngine();
		expect(engine.elements.keys()).toEqual([]);
		expect(engine.recipes.keys()).toEqual([]);
		expect(engine.actions.keys()).toEqual([]);
	});

	test('registers elements, recipes, and actions from options', () => {
		const cardRecipe = defineFormRecipe(
			defineRecipeSpec({
				$type: 'card',
				kind: 'single-step',
				metadata: { name: 'Card' },
				slotSchemas: { shell: z.strictObject({}) },
			}),
			{},
		);

		const engine = createFormEngine({
			elements: [noteElement],
			recipes: [cardRecipe],
		});

		expect(engine.elements.has('note')).toBe(true);
		expect(engine.recipes.has('card')).toBe(true);
	});

	test('rejects a hand-written wizard registration without an actions slot', () => {
		const wizard = {
			$type: 'hand-wizard',
			kind: 'wizard',
			slots: ['header'],
			schema: z.strictObject({ $type: z.literal('hand-wizard') }),
			metadata: { name: 'Hand wizard' },
			render: {},
		} as const;

		expect(() => createFormEngine({ recipes: [wizard] })).toThrow(/'hand-wizard'.*actions slot/);
	});

	test('accepts a hand-written wizard registration that declares actions', () => {
		const wizard = {
			$type: 'hand-wizard',
			kind: 'wizard',
			slots: ['actions'],
			schema: z.strictObject({ $type: z.literal('hand-wizard') }),
			metadata: { name: 'Hand wizard' },
			render: {},
		} as const;

		expect(createFormEngine({ recipes: [wizard] }).recipes.has('hand-wizard')).toBe(true);
	});

	test('rejects a hand-written single-step registration with a progress slot', () => {
		const card = {
			$type: 'hand-card',
			kind: 'single-step',
			slots: ['progress'],
			schema: z.strictObject({ $type: z.literal('hand-card') }),
			metadata: { name: 'Hand card' },
			render: {},
		} as const;

		expect(() => createFormEngine({ recipes: [card] })).toThrow(/'hand-card'.*progress slot/);
	});

	test('last registration wins for duplicate $type at runtime', () => {
		const first = defineInput({
			value: anyValue,
			$type: 'note',
			schema: noteSchema,
			metadata: { name: 'First note', category: 'input' },
			render: () => null,
		});
		const second = defineInput({
			value: anyValue,
			$type: 'note',
			schema: noteSchema,
			metadata: { name: 'Second note', category: 'input' },
			render: () => null,
		});

		const engine = createFormEngine({ elements: [first, second] });

		expect(engine.elements.get('note')?.metadata.name).toBe('Second note');
	});

	test('registers element validations on the engine validation registry', () => {
		const phoneElement = defineInput({
			value: anyValue,
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
					$type: 'phone',
					schema: PhoneRuleSchema,
					metadata: { name: 'Phone' },
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
		const registry = engine.validations;

		expect(registry.has('phone')).toBe(true);
		expect(getValidationRulesForElement({ $type: 'phone-input' }, registry)).toEqual([{ $type: 'phone' }]);
		expect(
			getValidationRulesForElement(
				{
					$type: 'phone-input',
					rules: [{ $type: 'phone', message: 'Use a complete number' }],
				},
				registry,
			),
		).toEqual([{ $type: 'phone', message: 'Use a complete number' }]);

		const schema = createZodSchemaFromRules([{ $type: 'phone' }], createValidationContext(), registry);
		expect(schema.safeParse('+44').success).toBe(false);
		expect(schema.safeParse('+44-complete').success).toBe(true);
	});

	test('does not leak element validations between engines', () => {
		const customValidation = {
			$type: 'custom-leak-test',
			schema: z.looseObject({ $type: z.literal('custom-leak-test') }),
			metadata: { name: 'Leak test' },
			category: 'string',
			defaultFor: ['leak-input'],
			handler: () => z.string(),
		} satisfies AnyValidationRegistration;
		const leakElement = defineInput({
			value: anyValue,
			$type: 'leak-input',
			schema: z.object({ $type: z.literal('leak-input'), name: z.string() }),
			metadata: { name: 'Leak', category: 'input' },
			render: () => null,
			validations: [customValidation],
		});
		const engineA = createFormEngine({ elements: [leakElement] });
		const engineB = createFormEngine({ elements: [] });

		expect(engineA.validations.has('custom-leak-test')).toBe(true);
		expect(engineB.validations.has('custom-leak-test')).toBe(false);
	});
});

const textareaElement = defineInput({
	value: anyValue,
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

		expect(base.elements.has('textarea')).toBe(false);
		expect(extended.elements.has('note')).toBe(true);
		expect(extended.elements.has('textarea')).toBe(true);
	});

	test('preserves the layout theme and its stylesheet', () => {
		const base = createFormEngine({
			elements: [noteElement],
			layout: { grid: { breakpoints: { md: '50rem' } } },
		});
		const extended = base.extend({ elements: [textareaElement] });

		expect(extended.getLayout()).toBe(base.getLayout());
		expect(extended.getLayout().grid.breakpoints.md).toBe('50rem');
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
	expect(extended.elements.has('note')).toBe(true);
});

test('a supplied catalog is copied and gains every registration entry', () => {
	const catalog = new SchemaMetadataCatalog();
	catalog.register(z.object({ tag: z.string() }), {
		id: 'custom:metadata',
		title: 'Custom metadata',
		componentType: ComponentType.Element,
	});
	const engine = createFormEngine({ elements: [noteElement], catalog });
	const extended = createFormEngine({ elements: [noteElement] }).extend({ elements: [textareaElement], catalog });

	expect(Object.keys(engine.generateJSONSchemaCollection().schemas)).toEqual([
		'custom:metadata',
		'element:note',
		'axis:size',
		'axis:surface',
		'validation-rule',
	]);
	expect(Object.keys(extended.generateJSONSchemaCollection().schemas)).toEqual([
		'custom:metadata',
		'element:note',
		'element:textarea',
		'axis:size',
		'axis:surface',
		'validation-rule',
	]);
	expect(catalog.getRegisteredSchemas()).toHaveLength(1);
});

test('extend replaces the catalog schema for an overridden registration', () => {
	const replacement = defineInput({
		value: anyValue,
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
		value: anyValue,
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
