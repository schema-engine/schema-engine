import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { FormComposer } from '@/builder';
import { FormValidationError } from '@/lib/validate-form';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';

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

const noteElement = {
	$type: 'note' as const,
	schema: noteSchema,
	metadata: { name: 'Note', category: 'input' as const },
	render: () => null,
};

const cardRecipeSchema = z
	.object({
		$type: z.literal('card'),
		header: z
			.object({
				title: z.string().default('Untitled'),
			})
			.default({ title: 'Untitled' }),
	})
	.transform((view) => ({
		...view,
		header: { title: view.header.title.toUpperCase() },
	}));

const cardRecipe = defineFormRecipe(
	defineRecipeSpec({
		$type: 'card',
		kind: 'single-step',
		metadata: { name: 'Card', description: 'Card with defaults' },
		slotSchemas: {
			header: z
				.object({
					title: z.string().default('Untitled'),
				})
				.default({ title: 'Untitled' }),
		},
		schema: cardRecipeSchema,
	}),
	{},
);

describe('defineForm contract', () => {
	test('keeps recipe defaults and transforms on the returned form', () => {
		const engine = new FormComposer().addRecipe(cardRecipe).build();

		const config = engine.defineForm({
			id: 'contact',
			view: { $type: 'card' },
			steps: [{ id: 'main', title: 'Contact', elements: [] }],
		});

		expect(config.view).toMatchObject({ $type: 'card', header: { title: 'UNTITLED' } });
	});

	test('mixed Zod and native Standard Schema registrations appear in the authoring schema', () => {
		const engine = new FormComposer()
			.addElement(noteElement)
			.addElement({
				$type: 'minimal-fixture',
				schema: createMinimalStandardSchema(),
				metadata: { name: 'Minimal fixture', category: 'input' },
				render: () => null,
			})
			.build();

		const nativeForm = {
			id: 'native',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'minimal-fixture' as const, id: 'field-1', name: 'field-1' }],
				},
			],
		};
		const zodForm = {
			id: 'zod',
			steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'note' as const, id: 'n1', name: 'n1' }] }],
		};

		expect(engine.defineForm(nativeForm).steps[0]?.elements[0]).toMatchObject({ $type: 'minimal-fixture' });
		expect(engine.defineForm(zodForm).steps[0]?.elements[0]).toMatchObject({ $type: 'note' });
		expect(engine.getFormConfigSchema().safeParse(nativeForm).success).toBe(true);
		expect(engine.getFormConfigSchema().safeParse(zodForm).success).toBe(true);
		expect(
			engine.getFormConfigSchema().safeParse({
				id: 'unknown',
				steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'missing', id: 'x', name: 'x' }] }],
			}).success,
		).toBe(false);
	});

	test('fluent build snapshots nested state and uses the same invariants as defineForm', () => {
		const engine = new FormComposer().addElement(noteElement).addRecipe(cardRecipe).build();
		const builder = engine.createFormDefinition();

		const first = builder
			.setId('contact')
			.setView('card', {})
			.addStep({ id: 'one', title: 'One' })
			.addElement('note', { id: 'n1', name: 'n1' })
			.build();

		expect(first.view).toMatchObject({ header: { title: 'UNTITLED' } });
		expect(first.steps).toHaveLength(1);

		expect(() => builder.addStep({ id: 'two', title: 'Two' }).build()).toThrow(FormValidationError);
		expect(first.steps).toHaveLength(1);
		expect(first.steps[0]?.elements).toHaveLength(1);

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
});
