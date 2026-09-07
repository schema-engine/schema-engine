import { describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { FormComposer } from '@/builder';
import {
	DEFAULT_WIZARD_RECIPE,
	FormValidationError,
	getRenderableSteps,
	resolveFormRecipe,
	resolveValidatedConfig,
} from '@/lib/validate-form';
import type { RecipeRegistration } from '@/types';
import { defineFormRecipe } from '@/recipes/define-form-recipe';
import { sidebarWizardSpec } from '@/recipes/built-in-specs';

const cardRecipeSchema = z
	.object({
		$type: z.literal('card'),
		shell: z.object({ padding: z.enum(['sm', 'md', 'lg']).optional() }).optional(),
	})
	.strict();

const cardRecipe: RecipeRegistration<'card', z.infer<typeof cardRecipeSchema>> = {
	$type: 'card',
	kind: 'single-step',
	slots: ['shell'],
	schema: cardRecipeSchema,
	metadata: { name: 'Card', description: 'Card shell recipe' },
	render: {},
};

const wizardRecipeSchema = z
	.object({
		$type: z.literal('wizard'),
		actions: z.object({ labels: z.object({ next: z.string().optional() }).optional() }).optional(),
	})
	.strict();

const wizardRecipe: RecipeRegistration<'wizard', z.infer<typeof wizardRecipeSchema>> = {
	$type: 'wizard',
	kind: 'wizard',
	slots: ['actions'],
	schema: wizardRecipeSchema,
	metadata: { name: 'Wizard', description: 'Wizard recipe' },
	render: {},
};

function createEngine() {
	return new FormComposer().addRecipe(cardRecipe).addRecipe(wizardRecipe).build();
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
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
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
			expect(warn.mock.calls[0]?.[0]).toMatch(/no 'bare-controls' recipe is registered/i);

			expect(resolveFormRecipe(config, { getRecipe: () => undefined })).toBeUndefined();
			expect(warn).toHaveBeenCalledTimes(2);
		} finally {
			warn.mockRestore();
		}
	});

	test('stays silent for multi-step forms without an engine', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
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

	test('requires an engine for explicit view configuration', () => {
		expect(() =>
			resolveValidatedConfig({
				id: 'contact',
				view: { $type: 'card' },
				steps: [{ id: 'main', title: 'Contact', elements: [] }],
			}),
		).toThrow(/no FormEngine was supplied/i);
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
		const payload = {
			id: 'login',
			view: { $type: 'card' as const, shell: { padding: 'md' as const } },
			steps: [{ id: 'login', title: 'Login', elements: [] }],
		};

		expect(engine.defineForm(payload)).toEqual(engine.validateForm(payload));
	});

	test('sidebar wizard form config accepts view.shell', () => {
		const engine = new FormComposer()
			.addRecipe(defineFormRecipe(sidebarWizardSpec, { shell: null, slots: {} }))
			.build();

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
		const engine = new FormComposer()
			.addElement({
				$type: 'note',
				schema: noteSchema,
				metadata: { name: 'Note', category: 'input' },
				render: () => null,
			})
			.build();

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
});
