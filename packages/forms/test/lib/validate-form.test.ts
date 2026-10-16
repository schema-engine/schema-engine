import { describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { DEFAULT_WIZARD_RECIPE, FormValidationError, getRenderableSteps, resolveFormRecipe } from '@/lib/validate-form';
import { isNormalizedFormConfig, isNormalizedElementConfig } from '@/lib/normalized-form-config';
import { defineFormRecipe } from '@/recipes/define-form-recipe';
import { defineRecipeSpec } from '@/recipes/define-recipe-spec';
import { sidebarWizardSpec } from '@/recipes/built-in-specs';
import { defineInput } from '@/types';
import { logger } from '@/lib/logger';

const cardRecipeSchema = z.strictObject({
	$type: z.literal('card'),
	shell: z.optional(z.strictObject({ padding: z.optional(z.enum(['sm', 'md', 'lg'])) })),
});

const cardRecipe = defineFormRecipe(
	defineRecipeSpec({
		$type: 'card',
		kind: 'single-step',
		metadata: { name: 'Card', description: 'Card shell recipe' },
		slotSchemas: { shell: z.strictObject({ padding: z.optional(z.enum(['sm', 'md', 'lg'])) }) },
		schema: cardRecipeSchema,
	}),
	{},
);

const wizardRecipeSchema = z.strictObject({
	$type: z.literal('wizard'),
	actions: z.optional(z.strictObject({ labels: z.optional(z.strictObject({ next: z.optional(z.string()) })) })),
});

const wizardRecipe = defineFormRecipe(
	defineRecipeSpec({
		$type: 'wizard',
		kind: 'wizard',
		metadata: { name: 'Wizard', description: 'Wizard recipe' },
		slotSchemas: {
			actions: z.strictObject({ labels: z.optional(z.strictObject({ next: z.optional(z.string()) })) }),
		},
		schema: wizardRecipeSchema,
	}),
	{},
);

function createEngine() {
	return createFormEngine({ recipes: [cardRecipe, wizardRecipe] });
}

describe('validateFormConfig', () => {
	test('resolves the registered default wizard recipe for multi-step forms', () => {
		const recipe = resolveFormRecipe(
			{
				id: 'wizard',
				steps: [
					{ id: 'one', title: 'One', elements: [] },
					{ id: 'two', title: 'Two', elements: [] },
				],
			},
			{ getRecipe: (id) => (id === DEFAULT_WIZARD_RECIPE ? wizardRecipe : undefined) },
		);

		expect(recipe).toBe(wizardRecipe);
	});

	test('accepts a getter function as the recipe lookup', () => {
		const recipe = resolveFormRecipe(
			{
				id: 'contact',
				view: { $type: 'card' },
				steps: [{ id: 'main', title: 'Contact', elements: [] }],
			},
			(id) => (id === 'card' ? cardRecipe : undefined),
		);

		expect(recipe).toBe(cardRecipe);
	});

	test('rejects a serialized engine object without getRecipe', () => {
		expect(() =>
			resolveFormRecipe(
				{
					id: 'contact',
					view: { $type: 'card' },
					steps: [{ id: 'main', title: 'Contact', elements: [] }],
				},
				{} as never,
			),
		).toThrow(/no getRecipe/i);
	});

	test('rejects a serialized engine object for implicit multi-step lookup', () => {
		expect(() =>
			resolveFormRecipe(
				{
					id: 'onboarding',
					steps: [
						{ id: 'one', title: 'One', elements: [] },
						{ id: 'two', title: 'Two', elements: [] },
					],
				},
				{} as never,
			),
		).toThrow(/no getRecipe/i);
	});

	test('warns once per engine when a multi-step form has no wizard recipe registered', () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
		const config = {
			id: 'headless-wizard',
			steps: [
				{ id: 'one', title: 'One', elements: [] },
				{ id: 'two', title: 'Two', elements: [] },
			],
		};
		const lookup = { getRecipe: () => undefined };

		try {
			expect(resolveFormRecipe(config, lookup)).toBeUndefined();
			expect(resolveFormRecipe(config, lookup)).toBeUndefined();
			expect(warn).toHaveBeenCalledTimes(1);
			expect(warn.mock.calls[0]?.map(String).join(' ')).toMatch(/no 'bare-controls' recipe is registered/i);

			expect(resolveFormRecipe(config, { getRecipe: () => undefined })).toBeUndefined();
			expect(warn).toHaveBeenCalledTimes(2);
		} finally {
			warn.mockRestore();
		}
	});

	test('stays silent for multi-step forms without an engine', () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
		try {
			expect(
				resolveFormRecipe({
					id: 'no-engine-wizard',
					steps: [
						{ id: 'one', title: 'One', elements: [] },
						{ id: 'two', title: 'Two', elements: [] },
					],
				}),
			).toBeUndefined();
			expect(warn).not.toHaveBeenCalled();
		} finally {
			warn.mockRestore();
		}
	});

	test('accepts a single-step form without view', () => {
		const engine = createEngine();
		const config = engine.validateForm({
			id: 'contact',
			steps: [{ id: 'main', title: 'Contact', elements: [] }],
		});

		expect(config.id).toBe('contact');
	});

	test('rejects unknown recipe type', () => {
		const engine = createEngine();

		expect(() =>
			engine.validateForm({
				id: 'bad',
				view: { $type: 'unknown-recipe' },
				steps: [{ id: 'main', title: 'Main', elements: [] }],
			}),
		).toThrow(FormValidationError);
	});

	test('rejects single-step recipe on multi-step form', () => {
		const engine = createEngine();

		expect(() =>
			engine.validateForm({
				id: 'bad',
				view: { $type: 'card' },
				steps: [
					{ id: 'one', title: 'One', elements: [] },
					{ id: 'two', title: 'Two', elements: [] },
				],
			}),
		).toThrow(/single-step/i);
	});

	test('rejects wizard recipe on single-step form', () => {
		const engine = createEngine();

		expect(() =>
			engine.validateForm({
				id: 'bad',
				view: { $type: 'wizard' },
				steps: [{ id: 'one', title: 'One', elements: [] }],
			}),
		).toThrow(/wizard/i);
	});

	test('rejects extra view keys for the recipe schema', () => {
		const engine = createEngine();

		expect(() =>
			engine.validateForm({
				id: 'bad',
				view: { $type: 'card', progress: { showPercentage: true } },
				steps: [{ id: 'one', title: 'One', elements: [] }],
			}),
		).toThrow(/progress/i);
	});

	test('defineForm and validateForm share the same validation path', () => {
		const engine = createEngine();

		expect(
			engine.defineForm({
				id: 'login',
				view: { $type: 'card', shell: { padding: 'md' } },
				steps: [{ id: 'login', title: 'Login', elements: [] }],
			}),
		).toEqual(
			engine.validateForm({
				id: 'login',
				view: { $type: 'card', shell: { padding: 'md' } },
				steps: [{ id: 'login', title: 'Login', elements: [] }],
			}),
		);
	});

	test('sidebar wizard form config accepts view.shell', () => {
		const engine = createFormEngine({
			recipes: [defineFormRecipe(sidebarWizardSpec, { shell: null, slots: {} })],
		});

		expect(() =>
			engine.validateForm({
				id: 'onboarding',
				view: {
					$type: 'sidebar-wizard',
					shell: { showSeparator: false },
					progress: { orientation: 'sidebar', showStepTitles: true },
				},
				steps: [
					{ id: 'one', title: 'One', elements: [] },
					{ id: 'two', title: 'Two', elements: [] },
				],
			}),
		).not.toThrow();
	});

	test('describeRecipe emits viewSchema from the recipe schema', () => {
		const engine = createEngine();
		const descriptor = engine.describeRecipe('card');

		expect(descriptor.$type).toBe('card');
		expect(descriptor.kind).toBe('single-step');
		expect(descriptor.viewSchema).toMatchObject({
			$id: 'recipe:card',
			$defs: {
				'recipe:card': {
					properties: {
						$type: { const: 'card' },
					},
				},
			},
		});
	});

	test('flattens every step when no recipe is resolved', () => {
		const config = {
			id: 'headless-wizard',
			steps: [
				{ id: 'one', title: 'One', elements: [] },
				{ id: 'two', title: 'Two', elements: [] },
			],
		};

		expect(getRenderableSteps(config, undefined, 0).map((step) => step.id)).toEqual(['one', 'two']);
		expect(getRenderableSteps(config, wizardRecipe, 1).map((step) => step.id)).toEqual(['two']);
	});

	test('validates registered Zod elements through defineForm', () => {
		const noteSchema = z.object({
			$type: z.literal('note'),
			id: z.string(),
			name: z.string(),
		});
		const engine = createFormEngine({
			elements: [
				{
					$type: 'note',
					schema: noteSchema,
					metadata: { name: 'Note', category: 'input' },
					render: () => null,
				},
			],
		});

		const config = engine.defineForm({
			id: 'notes',
			steps: [{ id: 'main', title: 'Notes', elements: [{ $type: 'note', id: 'n1', name: 'n1' }] }],
		});

		expect(config.steps[0]?.elements[0]).toMatchObject({ $type: 'note', id: 'n1' });
		expect(() =>
			engine.validateForm({
				id: 'bad',
				steps: [{ id: 'main', title: 'Notes', elements: [{ $type: 'note', id: 1, name: 'n1' }] }],
			}),
		).toThrow(/steps\[0\] \(id: 'main'\) elements\[0\].*Invalid element configuration.*\(id\)/s);
		expect(() =>
			engine.validateForm({
				id: 'unknown',
				steps: [{ id: 'main', title: 'Notes', elements: [{ $type: 'missing', id: 'x', name: 'x' }] }],
			}),
		).toThrow(/steps\[0\] \(id: 'main'\) elements\[0\] \(id: 'x'\).*Unknown element type 'missing'/s);
	});

	test('rejects a field rule that has no validation handler', () => {
		const field = defineInput({
			$type: 'field',
			schema: z.looseObject({
				$type: z.literal('field'),
				id: z.string(),
				name: z.string(),
				rules: z.optional(z.array(z.looseObject({ type: z.string() }))),
			}),
			metadata: { name: 'Field', category: 'input' },
			render: () => null,
		});
		const engine = createFormEngine({ elements: [field] });

		expect(() =>
			engine.validateForm({
				id: 'unsupported-rule',
				steps: [
					{
						id: 'main',
						title: 'Main',
						elements: [
							{ $type: 'field', id: 'quantity', name: 'quantity', rules: [{ type: 'unregistered' }] },
						],
					},
				],
			}),
		).toThrow(/field 'quantity'.*rule 'unregistered'/i);
	});

	test('marks validated forms and skips re-running registration transforms', () => {
		const countSchema = z.object({
			$type: z.literal('count'),
			id: z.string(),
			name: z.string(),
			count: z.pipe(
				z.string(),
				z.transform((value) => Number(value)),
			),
		});
		const engine = createFormEngine({
			elements: [
				{
					$type: 'count',
					schema: countSchema,
					metadata: { name: 'Count', category: 'input' },
					render: () => null,
				},
			],
		});

		const defined = engine.defineForm({
			id: 'counts',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'count', id: 'count', name: 'count', count: '3' }],
				},
			],
		});

		expect(defined.steps[0]?.elements[0]).toMatchObject({ count: 3 });
		expect(isNormalizedFormConfig(defined)).toBe(true);
		expect(isNormalizedFormConfig(defined, engine)).toBe(true);
		expect(engine.validateForm(defined)).toBe(defined);

		const otherEngine = createFormEngine();
		expect(isNormalizedFormConfig(defined, otherEngine)).toBe(false);
		expect(() => otherEngine.validateForm(defined)).toThrow(/already normalized by a different engine/i);

		expect(() => {
			(defined.steps[0]!.elements[0] as { id: unknown }).id = 1;
		}).toThrow(TypeError);
		expect(engine.validateForm(defined).steps[0]?.elements[0]).toMatchObject({ id: 'count', count: 3 });

		const copied = {
			...defined,
			steps: defined.steps.map((step) => ({
				...step,
				elements: step.elements.map((element) => ({ ...element, id: 1 })),
			})),
		};
		expect(isNormalizedFormConfig(copied, engine)).toBe(false);
		expect(() => engine.validateForm(copied)).toThrow(/Invalid element configuration/i);
	});

	test('validateElement applies transforms for standalone fields', () => {
		const countSchema = z.object({
			$type: z.literal('count'),
			id: z.string(),
			name: z.string(),
			count: z.pipe(
				z.string(),
				z.transform((value) => Number(value)),
			),
		});
		const engine = createFormEngine({
			elements: [
				{
					$type: 'count',
					schema: countSchema,
					metadata: { name: 'Count', category: 'input' },
					render: () => null,
				},
			],
		});

		const normalized = engine.validateElement({
			$type: 'count',
			id: 'count',
			name: 'count',
			count: '3',
		});
		expect(normalized).toMatchObject({ $type: 'count', id: 'count', count: 3 });
		expect(isNormalizedElementConfig(normalized)).toBe(true);
		expect(Object.isFrozen(normalized)).toBe(true);
		expect(() => engine.validateElement({ $type: 'unknown', id: 'x', name: 'x' })).toThrow(
			/Unknown element type 'unknown'/i,
		);
	});

	test('validates nested child elements before branding them as normalized', () => {
		const countSchema = z.object({
			$type: z.literal('count'),
			id: z.string(),
			name: z.string(),
			count: z.pipe(
				z.string(),
				z.transform((value) => Number(value)),
			),
		});
		const groupSchema = z.object({
			$type: z.literal('group'),
			id: z.string(),
			name: z.string(),
			elements: z.array(z.any()),
		});
		const engine = createFormEngine({
			elements: [
				{
					$type: 'count',
					schema: countSchema,
					metadata: { name: 'Count', category: 'input' },
					render: () => null,
				},
				{
					$type: 'group',
					schema: groupSchema,
					metadata: { name: 'Group', category: 'input' },
					render: () => null,
				},
			],
		});

		const defined = engine.defineForm({
			id: 'nested',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{
							$type: 'group',
							id: 'group',
							name: 'group',
							elements: [{ $type: 'count', id: 'count', name: 'count', count: '3' }],
						},
					],
				},
			],
		});

		const group = defined.steps[0]?.elements[0];
		const child = group?.elements?.[0];
		expect(child).toMatchObject({ $type: 'count', id: 'count', count: 3 });
		expect(isNormalizedElementConfig(group)).toBe(true);
		expect(isNormalizedElementConfig(child)).toBe(true);

		const standalone = engine.validateElement({
			$type: 'group',
			id: 'group',
			name: 'group',
			elements: [{ $type: 'count', id: 'count', name: 'count', count: '7' }],
		});
		expect(standalone.elements?.[0]).toMatchObject({ count: 7 });
		expect(isNormalizedElementConfig(standalone)).toBe(true);
		expect(isNormalizedElementConfig(standalone.elements?.[0])).toBe(true);

		expect(() =>
			engine.validateForm({
				id: 'bad-nested',
				steps: [
					{
						id: 'main',
						title: 'Main',
						elements: [
							{
								$type: 'group',
								id: 'group',
								name: 'group',
								elements: [{ $type: 'count', id: 'count', name: 'count', count: 3 }],
							},
						],
					},
				],
			}),
		).toThrow(
			/steps\[0\] \(id: 'main'\) elements\[0\] \(id: 'group'\) elements\[0\] \(id: 'count'\).*Invalid element configuration/s,
		);
	});

	test('normalized snapshot is owned and does not freeze caller objects', () => {
		const metaSchema = z.object({
			$type: z.literal('meta'),
			id: z.string(),
			name: z.string(),
			meta: z.object({ nested: z.object({ label: z.string() }) }),
		});
		const metaElement = defineInput({
			$type: 'meta',
			schema: metaSchema,
			metadata: { name: 'Meta', category: 'input' },
			render: () => null,
		});
		const engine = createFormEngine({
			elements: [metaElement],
		});

		const inner = { label: 'keep' };
		const meta = { nested: inner };
		Object.freeze(meta);

		const defined = engine.defineForm({
			id: 'owned',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'meta', id: 'm1', name: 'm1', meta }],
				},
			],
		});
		const payload = {
			id: 'owned',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'meta', id: 'm1', name: 'm1', meta }],
				},
			],
		};
		payload.id = 'mutated-input';
		inner.label = 'mutated';

		expect(defined.id).toBe('owned');
		expect(defined.steps[0]?.elements[0]).toMatchObject({ meta: { nested: { label: 'keep' } } });
		expect(Object.isFrozen(payload)).toBe(false);
		expect(Object.isFrozen(inner)).toBe(false);
		expect(Object.isFrozen(defined.steps[0]?.elements[0])).toBe(true);
		expect(isNormalizedElementConfig(defined.steps[0]?.elements[0])).toBe(true);
	});

	test('snapshot isolation copies plain objects and arrays; other objects remain shared', () => {
		const taggedSchema = z.object({
			$type: z.literal('tagged'),
			id: z.string(),
			name: z.string(),
			createdAt: z.any(),
		});
		const engine = createFormEngine({
			elements: [
				{
					$type: 'tagged',
					schema: taggedSchema,
					metadata: { name: 'Tagged', category: 'input' },
					render: () => null,
				},
			],
		});

		const createdAt = new Date('2020-01-02T00:00:00.000Z');
		const defined = engine.defineForm({
			id: 'shared-date',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'tagged', id: 't1', name: 't1', createdAt }],
				},
			],
		});

		const snapshot = defined.steps[0]?.elements[0];
		expect(snapshot?.createdAt).toBe(createdAt);
		createdAt.setUTCFullYear(2021);
		expect(createdAt.getUTCFullYear()).toBe(2021);
		expect(snapshot?.createdAt).toBe(createdAt);
	});

	test('rejects registrations without Standard Schema at compose time', () => {
		expect(() =>
			createFormEngine({
				elements: [
					{
						$type: 'broken',
						schema: {} as never,
						metadata: { name: 'Broken', category: 'input' },
						render: () => null,
					},
				],
			}),
		).toThrow(/must implement Standard Schema/i);
	});
});
