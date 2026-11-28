import { describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { BaseFieldSchema } from '@/schemas/base-field';
import { builtInAxes, createLayoutTheme, defineAxis, getDefaultLayoutTheme } from '@schema-engine/layout';
import { defineInput } from '@/types';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';
import { cardSpec, cardWizardSpec } from '@/recipes/built-in-specs';
import { anyValue } from '../lib/any-value';

const noteSchema = z.extend(BaseFieldSchema, { $type: z.literal('note') });
const fieldSetSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('fieldset'),
	elements: z.array(z.looseObject({ $type: z.string() })),
});

const note = defineInput({
	value: anyValue,
	$type: 'note',
	schema: noteSchema,
	appearanceAxes: ['size'],
	metadata: { name: 'Note', category: 'input' },
	render: () => null,
});
const plain = defineInput({
	value: anyValue,
	$type: 'plain',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('plain') }),
	metadata: { name: 'Plain', category: 'input' },
	render: () => null,
});
const fieldset = defineInput({
	$type: 'fieldset',
	schema: fieldSetSchema,
	containerKind: 'object',
	appearanceAxes: ['size', 'surface'],
	metadata: { name: 'Fieldset', category: 'input' },
	render: () => null,
});

const axis = (name: string, ...values: string[]) =>
	defineAxis({
		$type: name,
		metadata: { name },
		default: values[0] ?? 'a',
		values: Object.fromEntries(values.map((value) => [value, {}])),
	});
const tone = defineAxis({
	$type: 'tone',
	metadata: { name: 'Tone' },
	default: 'neutral',
	values: { neutral: {}, brand: { '--se-tone-accent': '#f60' } },
});
const toned = { appearance: [...builtInAxes, tone] };

const card = defineFormRecipe(cardSpec, {});
const cardWizard = defineFormRecipe(cardWizardSpec, {});

const engine = createFormEngine({ elements: [note, plain, fieldset], recipes: [card, cardWizard] });

const form = (
	overrides: Record<string, unknown> = {},
	elements: unknown[] = [{ $type: 'note', id: 'n', name: 'n' }],
) => ({
	id: 'styled',
	steps: [{ id: 'main', title: 'Main', elements }],
	...overrides,
});

describe('engine appearance vocabulary', () => {
	test('ships the size and surface axes', () => {
		expect(engine.getLayout().axes).toEqual({
			size: ['compact', 'default', 'comfortable'],
			surface: ['flat', 'outlined', 'elevated'],
		});
	});

	test('a host adds an axis next to the built-in ones', () => {
		const themed = createFormEngine({ layout: toned });
		expect(themed.getLayout().axes).toEqual({
			size: ['compact', 'default', 'comfortable'],
			surface: ['flat', 'outlined', 'elevated'],
			tone: ['neutral', 'brand'],
		});
	});

	test('a host replaces a built-in axis by listing one with the same $type last', () => {
		const dense = axis('size', 'dense', 'airy');
		const themed = createFormEngine({ layout: { appearance: [...builtInAxes, dense] } });
		expect(themed.getLayout().axes.size).toEqual(['dense', 'airy']);
		expect(themed.getLayout().appearance.get('size')).toMatchObject({ values: dense.values });
	});

	test('token values compile into the engine stylesheet, scoped by the one theme id', () => {
		const { id, css } = createFormEngine({ layout: toned }).getLayout();
		const rules = css.split('\n').filter((line) => line.includes('[data-se-tone="brand"]'));
		expect(rules.length).toBeGreaterThan(0);
		for (const rule of rules) {
			expect(rule).toContain(`[data-se-theme="${id}"]`);
			expect(rule).toContain('{--se-tone-accent:#f60;}');
		}
	});

	test('identical vocabularies share a theme id and different ones do not', () => {
		const a = createFormEngine({ layout: { appearance: [axis('tone', 'x', 'z')] } }).getLayout().id;
		expect(createFormEngine({ layout: { appearance: [axis('tone', 'x', 'z')] } }).getLayout().id).toBe(a);
		expect(createFormEngine({ layout: { appearance: [axis('tone', 'y', 'z')] } }).getLayout().id).not.toBe(a);
	});

	test('an axis name a renderer already uses is rejected', () => {
		expect(() => createFormEngine({ layout: { appearance: [axis('step', 'a', 'b')] } })).toThrowError(/reserved/i);
	});

	test('extend inherits the layout theme', () => {
		const themed = createFormEngine({ layout: toned });
		const extended = themed.extend({ elements: [note] });
		expect(extended.getLayout()).toBe(themed.getLayout());
		expect(extended.validateForm(form({ appearance: { tone: 'brand' } })).appearance).toEqual({ tone: 'brand' });
		expect(() => extended.validateForm(form({ appearance: { density: 'high' } }))).toThrowError(/density/);
	});
});

describe('the layout option and copies of a theme', () => {
	test('a theme from a second copy of the layout module keeps its id and axes', async () => {
		vi.resetModules();
		const other = await import('@schema-engine/layout');
		const foreign = other.createLayoutTheme({ appearance: [...other.builtInAxes, tone] });

		const built = createFormEngine({ layout: foreign });

		expect(built.getLayout()).toBe(foreign);
		expect(built.getLayout().id).toBe(foreign.id);
		expect(Object.keys(built.getLayout().axes)).toEqual(['size', 'surface', 'tone']);
	});

	test.each([
		['a spread copy', (theme: object) => ({ ...theme })],
		['a JSON copy', (theme: object) => JSON.parse(JSON.stringify(theme))],
	])('%s of a compiled theme throws instead of being recompiled', (_name, copy) => {
		const theme = createLayoutTheme(toned);
		expect(() => createFormEngine({ layout: copy(theme) as never })).toThrowError(
			/pass the compiled theme itself, not a copy/i,
		);
	});

	test('options with an unknown key throw, naming the key', () => {
		expect(() => createFormEngine({ layout: { gridd: {} } as never })).toThrowError(/'gridd'/);
	});
});

describe('the layout option', () => {
	test('a compiled theme is used as given, so engines can share it', () => {
		const theme = createLayoutTheme({
			grid: { minColumnWidth: '10rem' },
			...toned,
		});
		const first = createFormEngine({ layout: theme });
		const second = createFormEngine({ elements: [note], layout: theme });
		expect(first.getLayout()).toBe(theme);
		expect(second.getLayout()).toBe(theme);
		expect(first.getLayout().id).toBe(second.getLayout().id);
	});

	test('inline options compile to the same theme as createLayoutTheme', () => {
		const options = { grid: { minColumnWidth: '10rem' }, ...toned };
		expect(createFormEngine({ layout: options }).getLayout().id).toBe(createLayoutTheme(options).id);
	});

	test('an engine without a layout runs on the library default theme', () => {
		expect(createFormEngine().getLayout()).toBe(getDefaultLayoutTheme());
	});

	test('a compiled theme is checked against the renderer attribute names it skipped at compile time', () => {
		const theme = createLayoutTheme({ appearance: [axis('step', 'a', 'b')] });
		expect(() => createFormEngine({ layout: theme })).toThrowError(/'step'.*reserved/);
	});
});

describe('registration axis declarations', () => {
	test('an element declaring an axis the vocabulary lacks fails the engine build, naming both', () => {
		const typo = defineInput({
			value: anyValue,
			$type: 'typo',
			schema: z.extend(BaseFieldSchema, { $type: z.literal('typo') }),
			appearanceAxes: ['sise'],
			metadata: { name: 'Typo', category: 'input' },
			render: () => null,
		});
		expect(() => createFormEngine({ elements: [typo] })).toThrowError(/typo.*unknown appearance axis 'sise'/s);
	});

	test('an overridden element that declares an unknown axis does not fail the build', () => {
		const typo = defineInput({
			value: anyValue,
			$type: 'typo',
			schema: z.extend(BaseFieldSchema, { $type: z.literal('typo') }),
			appearanceAxes: ['sise'],
			metadata: { name: 'Typo', category: 'input' },
			render: () => null,
		});
		const fixed = defineInput({
			value: anyValue,
			$type: 'typo',
			schema: z.extend(BaseFieldSchema, { $type: z.literal('typo') }),
			appearanceAxes: ['size'],
			metadata: { name: 'Fixed', category: 'input' },
			render: () => null,
		});

		const built = createFormEngine({ elements: [typo, fixed] });

		expect(built.elements.get('typo')?.metadata.name).toBe('Fixed');
		expect(() => createFormEngine({ elements: [fixed, typo] })).toThrowError(/unknown appearance axis 'sise'/);
	});

	test('an element may declare an axis a host adds', () => {
		const tonedInput = defineInput({
			value: anyValue,
			$type: 'toned',
			schema: z.extend(BaseFieldSchema, { $type: z.literal('toned') }),
			appearanceAxes: ['tone'],
			metadata: { name: 'Toned', category: 'input' },
			render: () => null,
		});
		expect(() => createFormEngine({ elements: [tonedInput] })).toThrowError(/unknown appearance axis 'tone'/);
		expect(() => createFormEngine({ elements: [tonedInput], layout: toned })).not.toThrow();
	});

	test('a recipe slot declaring an axis the vocabulary lacks fails the engine build, naming both', () => {
		const typo = defineFormRecipe(
			defineRecipeSpec({
				$type: 'typo-card',
				kind: 'single-step',
				metadata: { name: 'Typo card' },
				slotSchemas: { shell: z.strictObject({ appearance: z.optional(z.record(z.string(), z.string())) }) },
				appearanceAxes: { shell: ['surfce'] },
			}),
			{},
		);
		expect(() => createFormEngine({ recipes: [typo] })).toThrowError(
			/typo-card.*shell.*unknown appearance axis 'surfce'/s,
		);
	});

	test('extend checks the added registrations against the inherited vocabulary', () => {
		const typo = defineInput({
			value: anyValue,
			$type: 'typo',
			schema: z.extend(BaseFieldSchema, { $type: z.literal('typo') }),
			appearanceAxes: ['sise'],
			metadata: { name: 'Typo', category: 'input' },
			render: () => null,
		});
		expect(() => engine.extend({ elements: [typo] })).toThrowError(/unknown appearance axis 'sise'/);
	});
});

describe('appearance resolution', () => {
	test('a form-level value reaches a field that supports the axis', () => {
		const config = engine.validateForm(form({ appearance: { size: 'compact' } }));
		expect(config.appearance).toEqual({ size: 'compact' });
		expect(config.steps[0].appearance).toEqual({ size: 'compact' });
		expect(config.steps[0].elements[0].appearance).toEqual({ size: 'compact' });
	});

	test('a step overrides the form and a field overrides the step', () => {
		const config = engine.validateForm({
			id: 'layers',
			appearance: { size: 'compact', surface: 'flat' },
			steps: [
				{
					id: 'main',
					title: 'Main',
					appearance: { size: 'default' },
					elements: [
						{ $type: 'note', id: 'a', name: 'a' },
						{ $type: 'note', id: 'b', name: 'b', appearance: { size: 'comfortable' } },
					],
				},
			],
		});
		const [a, b] = config.steps[0].elements;
		expect(config.steps[0].appearance).toEqual({ size: 'default', surface: 'flat' });
		expect(a.appearance).toEqual({ size: 'default' });
		expect(b.appearance).toEqual({ size: 'comfortable' });
	});

	test('an axis the element does not support is not inherited', () => {
		const config = engine.validateForm(
			form({ appearance: { surface: 'outlined' } }, [{ $type: 'note', id: 'n', name: 'n' }]),
		);
		expect(config.steps[0].elements[0].appearance).toBeUndefined();
	});

	test('children inherit from the container they sit in', () => {
		const config = engine.validateForm(
			form({}, [
				{
					$type: 'fieldset',
					id: 'group',
					name: 'group',
					appearance: { size: 'compact' },
					elements: [{ $type: 'note', id: 'child', name: 'child' }],
				},
			]),
		);
		const group = config.steps[0].elements[0] as unknown as { elements: Array<{ appearance?: unknown }> };
		expect(group.elements[0].appearance).toEqual({ size: 'compact' });
	});

	test('an element without appearance carries no appearance key', () => {
		const config = engine.validateForm(form());
		expect('appearance' in config.steps[0].elements[0]).toBe(false);
		expect('appearance' in config).toBe(false);
	});

	test('validateElement resolves a standalone element', () => {
		const element = engine.validateElement({ $type: 'note', id: 'n', name: 'n', appearance: { size: 'compact' } });
		expect(element.appearance).toEqual({ size: 'compact' });
	});
});

describe('appearance validation', () => {
	test('an unknown value names the path and the allowed values', () => {
		expect(() => engine.validateForm(form({ appearance: { surface: 'elevatd' } }))).toThrowError(
			/appearance\.surface.*'elevatd'.*flat, outlined, elevated/s,
		);
	});

	test('an undeclared axis names the axis', () => {
		expect(() => engine.validateForm(form({ appearance: { tone: 'brand' } }))).toThrowError(
			/appearance\.tone.*unknown axis 'tone'/is,
		);
	});

	test('a non-string value is rejected', () => {
		expect(() => engine.validateForm(form({ appearance: { size: 3 } }))).toThrowError(
			/^appearance\.size: Expected string/,
		);
		expect(() =>
			engine.validateForm(form({}, [{ $type: 'note', id: 'n', name: 'n', appearance: { size: 3 } }])),
		).toThrowError(/appearance\.size/);
	});

	test('a host axis the element does not declare fails on that element', () => {
		const themed = createFormEngine({
			elements: [fieldset, note],
			layout: toned,
		});
		expect(() =>
			themed.validateForm(
				form({}, [
					{ $type: 'fieldset', id: 'group', name: 'group', elements: [], appearance: { tone: 'brand' } },
				]),
			),
		).toThrowError(/fieldset.*appearance\.tone.*does not support|appearance\.tone.*fieldset.*does not support/s);
	});

	test('a host axis a form sets is only inherited by elements that declare it', () => {
		const tonedInput = defineInput({
			value: anyValue,
			$type: 'toned',
			schema: z.extend(BaseFieldSchema, { $type: z.literal('toned') }),
			appearanceAxes: ['tone'],
			metadata: { name: 'Toned', category: 'input' },
			render: () => null,
		});
		const themed = createFormEngine({
			elements: [tonedInput, plain],
			layout: toned,
		});
		const config = themed.validateForm(
			form({ appearance: { tone: 'brand' } }, [
				{ $type: 'toned', id: 'a', name: 'a' },
				{ $type: 'plain', id: 'b', name: 'b' },
			]),
		);
		expect(config.steps[0].elements[0].appearance).toEqual({ tone: 'brand' });
		expect(config.steps[0].elements[1].appearance).toBeUndefined();
	});

	test('step and field errors name their location', () => {
		expect(() =>
			engine.validateForm({
				id: 'f',
				steps: [{ id: 's', title: 'S', appearance: { size: 'huge' }, elements: [] }],
			}),
		).toThrowError(/steps\[0\].*appearance\.size.*huge/s);
		expect(() =>
			engine.validateForm(form({}, [{ $type: 'note', id: 'n', name: 'n', appearance: { size: 'huge' } }])),
		).toThrowError(/elements\[0\].*appearance\.size.*huge/s);
	});
});

describe('recipe slot appearance', () => {
	const cardForm = (view: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
		form({ view: { $type: 'card', ...view }, ...extra });

	test('a slot takes an appearance', () => {
		const config = engine.validateForm(cardForm({ shell: { appearance: { surface: 'elevated' } } }));
		expect((config.view as { shell: { appearance: unknown } }).shell.appearance).toEqual({ surface: 'elevated' });
	});

	test('a form-level value reaches a slot that supports the axis', () => {
		const config = engine.validateForm(cardForm({}, { appearance: { surface: 'outlined', size: 'compact' } }));
		const view = config.view as { shell: { appearance: unknown }; header: { appearance?: unknown } };
		expect(view.shell.appearance).toEqual({ surface: 'outlined', size: 'compact' });
		expect(view.header.appearance).toBeUndefined();
	});

	test('a slot value overrides the form value', () => {
		const config = engine.validateForm(
			cardForm({ shell: { appearance: { surface: 'flat' } } }, { appearance: { surface: 'elevated' } }),
		);
		expect((config.view as { shell: { appearance: unknown } }).shell.appearance).toEqual({ surface: 'flat' });
	});

	test('a slot rejects an axis it does not declare, naming the slot', () => {
		expect(() => engine.validateForm(cardForm({ header: { appearance: { surface: 'flat' } } }))).toThrowError(
			/header.*appearance\.surface.*does not support/s,
		);
	});

	test('a slot rejects an unknown value naming the path and allowed values', () => {
		expect(() => engine.validateForm(cardForm({ shell: { appearance: { surface: 'elevatd' } } }))).toThrowError(
			/view\.shell.*appearance\.surface.*'elevatd'.*flat, outlined, elevated/s,
		);
	});

	test('structural slot config is unaffected', () => {
		const config = engine.validateForm({
			id: 'wizard',
			view: {
				$type: 'card-wizard',
				header: { showDescription: false },
				shell: { appearance: { size: 'compact' } },
			},
			steps: [
				{ id: 'one', title: 'One', elements: [] },
				{ id: 'two', title: 'Two', elements: [] },
			],
		});
		const view = config.view as { header: { showDescription: boolean } };
		expect(view.header.showDescription).toBe(false);
	});

	test.each(['maxWidth', 'padding', 'shadowSize'])('a card shell no longer takes %s', (key) => {
		expect(() => engine.validateForm(cardForm({ shell: { [key]: 'md' } }))).toThrowError(
			new RegExp(`^view\\.shell\\.${key}: Unrecognized key: ${key}`),
		);
	});

	test('a slot may not declare axes for a slot the recipe lacks', () => {
		expect(() =>
			defineRecipeSpec({
				$type: 'bad',
				kind: 'single-step',
				metadata: { name: 'Bad' },
				slotSchemas: { shell: z.strictObject({}) },
				// @ts-expect-error -- the recipe declares no header slot
				appearanceAxes: { header: ['size'] },
			}),
		).toThrowError(/header/);
	});
});
