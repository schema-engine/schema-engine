import { describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { FormValidationError, getRenderableSteps } from '@/lib/validate-form';
import { isNormalizedFormConfig, isNormalizedElementConfig } from '@/lib/normalized-form-config';
import { defineFormRecipe } from '@/recipes/define-form-recipe';
import { defineRecipeSpec } from '@/recipes/define-recipe-spec';
import { sidebarWizardSpec } from '@/recipes/built-in-specs';
import { defineInput } from '@/types';
import { ElementGridConfigSchema } from '@/schemas/base-field';
import { elementChildrenSchema } from '@/lib/element-children';
import { logger } from '@/lib/logger';

const cardRecipe = defineFormRecipe(
	defineRecipeSpec({
		$type: 'card',
		kind: 'single-step',
		metadata: { name: 'Card', description: 'Card shell recipe' },
		slotSchemas: { shell: z.strictObject({ padding: z.optional(z.enum(['sm', 'md', 'lg'])) }) },
	}),
	{},
);

const wizardRecipe = defineFormRecipe(
	defineRecipeSpec({
		$type: 'wizard',
		kind: 'wizard',
		metadata: { name: 'Wizard', description: 'Wizard recipe' },
		slotSchemas: {
			actions: z.strictObject({ labels: z.optional(z.strictObject({ next: z.optional(z.string()) })) }),
		},
	}),
	{},
);

const bareControlsRecipe = defineFormRecipe(
	defineRecipeSpec({
		$type: 'bare-controls',
		kind: 'wizard',
		metadata: { name: 'Bare controls', description: 'Bare wizard recipe' },
		slotSchemas: { actions: z.strictObject({}) },
	}),
	{},
);

const nestedDefaultsRecipe = defineFormRecipe(
	defineRecipeSpec({
		$type: 'nested',
		kind: 'single-step',
		metadata: { name: 'Nested', description: 'Recipe with nested slot defaults' },
		slotSchemas: {
			header: z.strictObject({
				size: z.optional(z.string()),
				labels: z.optional(z.strictObject({ a: z.optional(z.string()), b: z.optional(z.string()) })),
			}),
		},
		slotDefaults: { header: { size: 'sm', labels: { a: 'A', b: 'default b' } } },
	}),
	{},
);

const twoStepForm = {
	id: 'wizard',
	steps: [
		{ id: 'one', title: 'One', elements: [] },
		{ id: 'two', title: 'Two', elements: [] },
	],
};

function createEngine() {
	return createFormEngine({ recipes: [cardRecipe, wizardRecipe] });
}

const formWith = (elements: unknown[], grid?: unknown) => ({
	id: 'widths',
	...(grid ? { grid } : {}),
	steps: [{ id: 'main', title: 'Main', elements }],
});
const fieldNamed = (name: string, grid?: unknown) => ({ $type: 'field', id: name, name, ...(grid ? { grid } : {}) });

describe('validateFormConfig', () => {
	test('writes the default wizard recipe as the view of a multi-step form without view', () => {
		const engine = createFormEngine({ recipes: [bareControlsRecipe] });
		expect(engine.validateForm(twoStepForm).view?.$type).toBe('bare-controls');
	});

	test('writes the engine defaultWizardRecipe as the view', () => {
		const engine = createFormEngine({ recipes: [cardRecipe, wizardRecipe], defaultWizardRecipe: 'wizard' });
		expect(engine.validateForm(twoStepForm).view?.$type).toBe('wizard');
		expect(engine.extend().validateForm(twoStepForm).view?.$type).toBe('wizard');
	});

	test('rejects a single-step recipe registered as the implicit bare-controls default', () => {
		const singleStepBare = defineFormRecipe(
			defineRecipeSpec({
				$type: 'bare-controls',
				kind: 'single-step',
				metadata: { name: 'Bare', description: 'Single-step recipe named like the default' },
				slotSchemas: { shell: z.strictObject({}) },
			}),
			{},
		);
		expect(() => createFormEngine({ recipes: [singleStepBare] })).toThrow(/must be a wizard recipe/);
	});

	test.each([
		['an unregistered recipe', 'missing'],
		['a single-step recipe', 'card'],
	])('rejects defaultWizardRecipe naming %s at engine build', (_label, name) => {
		expect(() => createFormEngine({ recipes: [cardRecipe], defaultWizardRecipe: name })).toThrow(
			/defaultWizardRecipe/,
		);
	});

	test.each([
		['rows', 2],
		['autoFit', true],
		['autoFill', true],
		['maxColumnWidth', '20rem'],
	])('rejects unsupported grid key %s at every breakpoint', (key, value) => {
		const engine = createEngine();
		const form = { id: 'grid', steps: [{ id: 'main', title: 'Main', elements: [] }] };
		expect(() => engine.validateForm({ ...form, grid: { [key]: value } })).toThrow(FormValidationError);
		expect(() => engine.validateForm({ ...form, grid: { responsive: { md: { [key]: value } } } })).toThrow(
			FormValidationError,
		);
	});

	describe('named grid widths', () => {
		const gridField = defineInput({
			$type: 'field',
			schema: z.looseObject({
				$type: z.literal('field'),
				id: z.string(),
				name: z.string(),
				grid: z.optional(ElementGridConfigSchema),
			}),
			metadata: { name: 'Field', category: 'input' },
			render: () => null,
		});
		const group = defineInput({
			$type: 'group',
			containerKind: 'object',
			schema: z.looseObject({
				$type: z.literal('group'),
				id: z.string(),
				name: z.string(),
				elements: elementChildrenSchema,
			}),
			metadata: { name: 'Group', category: 'input' },
			render: () => null,
		});
		const engine = createFormEngine({ elements: [gridField, group] });
		test('accepts widths and offsets on a grid that sets no columns', () => {
			expect(() =>
				engine.validateForm(
					formWith(
						[fieldNamed('a', { width: 'half' }), fieldNamed('b', { width: 'half', offset: 'quarter' })],
						{
							gap: 'loose',
						},
					),
				),
			).not.toThrow();
		});

		test.each([
			['columns', { columns: 3 }, 'columns'],
			['auto columns', { columns: 'auto' }, 'columns'],
			['a responsive columns entry', { responsive: { md: { columns: 2 } } }, 'columns'],
			['a minimum column width', { minColumnWidth: '12rem' }, 'minColumnWidth'],
			[
				'a responsive minimum column width',
				{ responsive: { lg: { minColumnWidth: '12rem' } } },
				'minColumnWidth',
			],
		])('rejects a grid with %s when a field uses width', (_label, grid, key) => {
			const attempt = () => engine.validateForm(formWith([fieldNamed('a', { width: 'half' })], grid));
			expect(attempt).toThrow(FormValidationError);
			expect(attempt).toThrow(/uses areas, widths or columns/);
			expect(attempt).toThrow(new RegExp(`Form grid sets '${key}'`));
			expect(attempt).toThrow(/'a'/);
		});

		test('ignores grid keys that are present but undefined', () => {
			expect(() =>
				engine.validateForm(
					formWith([fieldNamed('a', { width: undefined, column: 2 })], {
						columns: undefined,
						minColumnWidth: undefined,
					}),
				),
			).not.toThrow();
			expect(() =>
				engine.validateForm(formWith([fieldNamed('a', { offset: undefined, column: 2 })])),
			).not.toThrow();
		});

		test('rejects columns when a field uses a responsive width or an offset', () => {
			const grid = { columns: 3 };
			expect(() =>
				engine.validateForm(formWith([fieldNamed('a', { responsive: { md: { width: 'third' } } })], grid)),
			).toThrow(/uses areas, widths or columns/);
			expect(() => engine.validateForm(formWith([fieldNamed('a', { offset: 'half' })], grid))).toThrow(
				/uses areas, widths or columns/,
			);
		});

		test('keeps columns working when no field uses width', () => {
			expect(() =>
				engine.validateForm(formWith([fieldNamed('a', { column: 'span 2' })], { columns: 3 })),
			).not.toThrow();
		});

		test.each([
			['a width and a raw column', { width: 'half', column: 2 }],
			['an offset and a raw column', { offset: 'quarter', column: '4 / 10' }],
			['a responsive width next to a column', { column: 2, responsive: { md: { width: 'half' } } }],
			['a width next to a responsive column', { width: 'half', responsive: { md: { column: 2 } } }],
		])('rejects a field that sets %s', (_label, grid) => {
			const attempt = () => engine.validateForm(formWith([fieldNamed('a', grid)]));
			expect(attempt).toThrow(FormValidationError);
			expect(attempt).toThrow(/'a'.*'(width|offset)'.*'column'|'a'.*'column'.*'(width|offset)'/);
		});

		test('allows a width with a raw row', () => {
			expect(() => engine.validateForm(formWith([fieldNamed('a', { width: 'half', row: 2 })]))).not.toThrow();
		});

		test.each([['wide'], ['full-ish']])('rejects the unknown width %s', (width) => {
			expect(() => engine.validateForm(formWith([fieldNamed('a', { width })]))).toThrow(FormValidationError);
		});

		test.each([['full'], ['auto']])('rejects %s as an offset', (offset) => {
			expect(() => engine.validateForm(formWith([fieldNamed('a', { offset })]))).toThrow(FormValidationError);
		});

		test('rejects auto as a width', () => {
			expect(() => engine.validateForm(formWith([fieldNamed('a', { width: 'auto' })]))).toThrow(
				FormValidationError,
			);
		});

		test('accepts widths on a container and on its children', () => {
			const form = formWith([
				{
					$type: 'group',
					id: 'g',
					name: 'g',
					grid: { width: 'half' },
					elements: [fieldNamed('inner', { width: 'half' }), fieldNamed('other', { offset: 'quarter' })],
				},
			]);
			expect(() => engine.validateForm(form)).not.toThrow();
		});

		test('keeps the step columns apart from the widths of a container children', () => {
			const form = formWith(
				[{ $type: 'group', id: 'g', name: 'g', elements: [fieldNamed('inner', { width: 'half' })] }],
				{ columns: 3 },
			);
			expect(() => engine.validateForm(form)).not.toThrow();
		});

		test('rejects a nested width and offset past the twelve tracks, naming its path', () => {
			const form = formWith([
				{
					$type: 'group',
					id: 'g',
					name: 'g',
					elements: [fieldNamed('inner', { width: 'two-thirds', offset: 'half' })],
				},
			]);
			const attempt = () => engine.validateForm(form);
			expect(attempt).toThrow(/elements\[0\].*elements\[0\].*'inner'.*'width'.*'offset'.*12 tracks/);
		});

		test('rejects a nested width next to a raw column', () => {
			const form = formWith([
				{ $type: 'group', id: 'g', name: 'g', elements: [fieldNamed('inner', { width: 'half', column: 2 })] },
			]);
			expect(() => engine.validateForm(form)).toThrow(/'inner'.*'width' and 'column'/);
		});

		test.each([
			['two-thirds beside a half offset', { width: 'two-thirds', offset: 'half' }],
			['three-quarters beside a third offset', { width: 'three-quarters', offset: 'third' }],
			['full beside any offset', { width: 'full', offset: 'quarter' }],
			[
				'a wider width that meets the offset carried from a narrower slot',
				{ width: 'half', offset: 'half', responsive: { md: { width: 'two-thirds' } } },
			],
			[
				'a wider offset that meets the width carried from a narrower slot',
				{ width: 'half', offset: 'quarter', responsive: { lg: { offset: 'two-thirds' } } },
			],
			[
				'an offset in responsive.default',
				{ width: 'three-quarters', responsive: { default: { offset: 'half' } } },
			],
		])('rejects %s past the twelve tracks', (_label, grid) => {
			const attempt = () => engine.validateForm(formWith([fieldNamed('a', grid)]));
			expect(attempt).toThrow(FormValidationError);
			expect(attempt).toThrow(/'a'.*'width'.*'offset'.*12 tracks/);
		});

		test.each([
			['half beside a half offset', { width: 'half', offset: 'half' }],
			['half centred', { width: 'half', offset: 'quarter' }],
			[
				'a width that shrinks the sum below twelve',
				{ width: 'two-thirds', offset: 'third', responsive: { md: { width: 'third' } } },
			],
			['an offset on its own', { offset: 'three-quarters' }],
		])('accepts %s', (_label, grid) => {
			expect(() => engine.validateForm(formWith([fieldNamed('a', grid)]))).not.toThrow();
		});

		test('allows a raw column field next to width fields', () => {
			expect(() =>
				engine.validateForm(
					formWith([fieldNamed('a', { width: 'half' }), fieldNamed('b', { column: 'span 2' })]),
				),
			).not.toThrow();
		});
	});

	test('warns once per form id and leaves the view unset when no default wizard recipe is registered', () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
		try {
			const engine = createEngine();
			expect(engine.validateForm(twoStepForm).view).toBeUndefined();
			expect(warn).toHaveBeenCalledTimes(1);
			engine.validateForm(twoStepForm);
			expect(warn).toHaveBeenCalledTimes(1);
			engine.validateForm({ ...twoStepForm, id: 'another' });
			expect(warn).toHaveBeenCalledTimes(2);
			expect(warn.mock.calls[0]?.map(String).join(' ')).toMatch(/no 'bare-controls' recipe is registered/i);
		} finally {
			warn.mockRestore();
		}
	});

	test('keeps nested recipe defaults the author did not set', () => {
		const engine = createFormEngine({ recipes: [nestedDefaultsRecipe] });
		const form = engine.validateForm({
			id: 'nested',
			steps: [{ id: 'one', title: 'One', elements: [] }],
			view: { $type: 'nested', header: { labels: { b: 'B' } } },
		});
		expect(form.view).toEqual({ $type: 'nested', header: { size: 'sm', labels: { a: 'A', b: 'B' } } });
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

	test('flattens every step when the form has no view', () => {
		const config = {
			id: 'headless-wizard',
			steps: [
				{ id: 'one', title: 'One', elements: [] },
				{ id: 'two', title: 'Two', elements: [] },
			],
		};

		expect(getRenderableSteps(config, 0).map((step) => step.id)).toEqual(['one', 'two']);
		expect(getRenderableSteps({ ...config, view: { $type: 'wizard' } }, 1).map((step) => step.id)).toEqual(['two']);
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
