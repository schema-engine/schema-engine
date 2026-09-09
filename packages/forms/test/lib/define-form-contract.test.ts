import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';
import { defineInput } from '@/types';

type MinimalFixtureConfig = {
	id: string;
	name: string;
	$type: 'minimal-fixture';
};

function createMinimalStandardSchema(): StandardSchemaV1<MinimalFixtureConfig> {
	return {
		'~standard': {
			version: 1,
			vendor: 'schema-engine-test',
			validate(value) {
				if (
					typeof value === 'object' &&
					value !== null &&
					'id' in value &&
					'name' in value &&
					'$type' in value &&
					(value as MinimalFixtureConfig).$type === 'minimal-fixture'
				) {
					return { value: value as MinimalFixtureConfig };
				}

				return { issues: [{ message: 'Invalid minimal-fixture config' }] };
			},
		},
	};
}

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

const cardRecipeSchema = z.pipe(
	z.object({
		$type: z.literal('card'),
		header: z._default(z.object({ title: z._default(z.string(), 'Untitled') }), { title: 'Untitled' }),
	}),
	z.transform((view) => ({
		...view,
		header: { title: view.header.title.toUpperCase() },
	})),
);

const cardRecipe = defineFormRecipe(
	defineRecipeSpec({
		$type: 'card',
		kind: 'single-step',
		metadata: { name: 'Card', description: 'Card with defaults' },
		slotSchemas: {
			header: z._default(z.object({ title: z._default(z.string(), 'Untitled') }), { title: 'Untitled' }),
		},
		schema: cardRecipeSchema,
	}),
	{},
);

describe('defineForm contract', () => {
	test('keeps recipe defaults and transforms on the returned form', () => {
		const engine = createFormEngine({ recipes: [cardRecipe] });

		const config = engine.defineForm({
			id: 'contact',
			view: { $type: 'card' },
			steps: [{ id: 'main', title: 'Contact', elements: [] }],
		});

		expect(config.view).toMatchObject({ $type: 'card', header: { title: 'UNTITLED' } });
	});

	test('mixed Zod and native Standard Schema registrations appear in the authoring schema', () => {
		const minimalFixtureElement = defineInput({
			$type: 'minimal-fixture',
			schema: createMinimalStandardSchema(),
			metadata: { name: 'Minimal fixture', category: 'input' },
			render: () => null,
		});
		const engine = createFormEngine({
			elements: [noteElement, minimalFixtureElement],
		});

		expect(
			engine.defineForm({
				id: 'native',
				steps: [
					{
						id: 'main',
						title: 'Main',
						elements: [{ $type: 'minimal-fixture', id: 'field-1', name: 'field-1' }],
					},
				],
			}).steps[0]?.elements[0],
		).toMatchObject({ $type: 'minimal-fixture' });
		expect(
			engine.defineForm({
				id: 'zod',
				steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'note', id: 'n1', name: 'n1' }] }],
			}).steps[0]?.elements[0],
		).toMatchObject({ $type: 'note' });

		const nativeForm = {
			id: 'native',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'minimal-fixture', id: 'field-1', name: 'field-1' }],
				},
			],
		};
		const zodForm = {
			id: 'zod',
			steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'note', id: 'n1', name: 'n1' }] }],
		};
		expect(engine.getFormConfigSchema().safeParse(nativeForm).success).toBe(true);
		expect(engine.getFormConfigSchema().safeParse(zodForm).success).toBe(true);
		expect(
			engine.getFormConfigSchema().safeParse({
				id: 'unknown',
				steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'missing', id: 'x', name: 'x' }] }],
			}).success,
		).toBe(false);
	});

	test('single-step recipe rejects extra steps via defineForm', () => {
		const engine = createFormEngine({ elements: [noteElement], recipes: [cardRecipe] });

		const form = engine.defineForm({
			id: 'contact',
			view: { $type: 'card' },
			steps: [{ id: 'one', title: 'One', elements: [{ $type: 'note', id: 'n1', name: 'n1' }] }],
		});

		expect(form.view).toMatchObject({ header: { title: 'UNTITLED' } });
		expect(form.steps).toHaveLength(1);
		expect(form.steps[0]?.elements).toHaveLength(1);

		expect(() =>
			engine.defineForm({
				id: 'contact',
				view: { $type: 'card' },
				steps: [
					{ id: 'one', title: 'One', elements: [] },
					{ id: 'two', title: 'Two', elements: [] },
				],
			}),
		).toThrow(/single-step/i);
	});

	test('bulk registration preserves defineForm authoring types', () => {
		const engine = createFormEngine({ elements: [noteElement], recipes: [cardRecipe] });

		const form = engine.defineForm({
			id: 'bulk',
			view: { $type: 'card' },
			steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'note', id: 'n1', name: 'n1' }] }],
		});

		expect(form.steps[0]?.elements[0]).toMatchObject({ $type: 'note', id: 'n1' });
	});

	test('ordinary registration arrays preserve defineForm authoring types', () => {
		const elements = [noteElement];
		const recipes = [cardRecipe];
		const engine = createFormEngine({ elements, recipes });

		const form = engine.defineForm({
			id: 'array-bulk',
			view: { $type: 'card' },
			steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'note', id: 'n1', name: 'n1' }] }],
		});

		expect(form.steps[0]?.elements[0]).toMatchObject({ $type: 'note', id: 'n1' });
	});
});
