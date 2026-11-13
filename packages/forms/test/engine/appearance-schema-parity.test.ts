import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import * as zm from 'zod/mini';
import { builtInAxes, defineAxis } from '@schema-engine/layout';
import { createFormEngine } from '@/engine/create-form-engine';
import { BaseFieldSchema } from '@/schemas/base-field';
import { defineInput } from '@/types';
import { defineFormRecipe } from '@/recipes';
import * as builtInSpecs from '@/recipes/built-in-specs';

const tone = defineAxis({
	$type: 'tone',
	metadata: { name: 'Tone' },
	default: 'neutral',
	values: { neutral: {}, brand: {} },
});

const field = ($type: string, appearanceAxes?: string[]) =>
	defineInput({
		$type,
		schema: zm.extend(BaseFieldSchema, { $type: zm.literal($type) }),
		...(appearanceAxes ? { appearanceAxes } : {}),
		metadata: { name: $type, category: 'input' },
		render: () => null,
	});

const strictField = defineInput({
	$type: 'strict',
	schema: zm.strictObject({ $type: zm.literal('strict'), id: zm.string(), name: zm.string() }),
	appearanceAxes: ['tone'],
	metadata: { name: 'Strict', category: 'input' },
	render: () => null,
});

const looseField = defineInput({
	$type: 'loose',
	schema: zm.object({ $type: zm.literal('loose'), id: zm.string(), name: zm.string() }),
	metadata: { name: 'Loose', category: 'input' },
	render: () => null,
});

const pipedField = defineInput({
	$type: 'piped',
	schema: zm.pipe(
		zm.extend(BaseFieldSchema, { $type: zm.literal('piped') }),
		zm.transform((config) => ({ ...config, normalized: true })),
	),
	appearanceAxes: ['size'],
	metadata: { name: 'Piped', category: 'input' },
	render: () => null,
});

const elements = [
	field('plain'),
	field('sized', ['size']),
	field('surfaced', ['size', 'surface']),
	field('toned', ['tone']),
	strictField,
	looseField,
	pipedField,
];
const recipes = Object.values(builtInSpecs)
	.filter((spec) => typeof spec === 'object' && spec !== null && '$type' in spec && 'slotSchemas' in spec)
	.map((spec) => defineFormRecipe(spec as typeof builtInSpecs.cardSpec, {}));

const engine = createFormEngine({
	elements,
	recipes,
	layout: { appearance: [...builtInAxes, tone] },
});

const jsonSchemaValidator = z.fromJSONSchema(
	engine.generateFormConfigSchema({ io: 'input' }) as z.core.JSONSchema.JSONSchema,
);
const axes = engine.getLayout().axes;

/** Every pick worth trying on an owner: one axis at a time, each value, a bad value and a stray axis. */
const picks: Array<Record<string, string>> = [
	{},
	...Object.entries(axes).flatMap(([axis, values]) => [
		...values.map((value) => ({ [axis]: value })),
		{ [axis]: 'not-a-value' },
	]),
	{ undeclared: 'compact' },
];

const accepted = (config: unknown) => ({
	validation: engine.safeValidateForm(config).success,
	jsonSchema: jsonSchemaValidator.safeParse(config).success,
});

const formWithElement = (element: Record<string, unknown>) => ({
	id: 'f',
	steps: [{ id: 's', title: 'S', elements: [element] }],
});

describe('the JSON Schema and validation accept the same appearance picks', () => {
	test('the sample forms are valid before a pick is added', () => {
		expect(accepted(formWithElement({ $type: 'plain', id: 'a', name: 'a' }))).toEqual({
			validation: true,
			jsonSchema: true,
		});
	});

	describe.each(elements.map((element) => [element.$type, element] as const))('element %s', ($type) => {
		test.each(picks.map((pick) => [JSON.stringify(pick), pick] as const))('pick %s', (_label, pick) => {
			const result = accepted(formWithElement({ $type, id: 'a', name: 'a', appearance: pick }));
			expect(result.jsonSchema).toBe(result.validation);
		});

		test('exactly the declared axes are accepted', () => {
			const declared = engine.getElement($type)?.appearanceAxes ?? [];
			const allowed = Object.keys(axes).filter(
				(axis) =>
					accepted(formWithElement({ $type, id: 'a', name: 'a', appearance: { [axis]: axes[axis][0] } }))
						.jsonSchema,
			);
			expect(allowed).toEqual(Object.keys(axes).filter((axis) => declared.includes(axis)));
		});
	});

	describe.each(recipes.map((recipe) => [recipe.$type, recipe] as const))('recipe %s', (_type, recipe) => {
		const steps = recipe.kind === 'wizard' ? 2 : 1;
		const formWithSlot = (slot: string, appearance: Record<string, string>) => ({
			id: 'f',
			steps: Array.from({ length: steps }, (_, index) => ({
				id: `s${index}`,
				title: 'S',
				elements: [{ $type: 'plain', id: 'a', name: 'a' }],
			})),
			view: { $type: recipe.$type, [slot]: { appearance } },
		});

		describe.each(recipe.slots.map((slot) => [slot] as const))('slot %s', (slot) => {
			test.each(picks.map((pick) => [JSON.stringify(pick), pick] as const))('pick %s', (_label, pick) => {
				const result = accepted(formWithSlot(slot, pick));
				expect(result.jsonSchema).toBe(result.validation);
			});

			test('exactly the declared axes are accepted', () => {
				const declared = recipe.appearanceAxes?.[slot] ?? [];
				const allowed = Object.keys(axes).filter(
					(axis) => accepted(formWithSlot(slot, { [axis]: axes[axis][0] })).jsonSchema,
				);
				expect(allowed).toEqual(Object.keys(axes).filter((axis) => declared.includes(axis)));
			});
		});
	});
});
