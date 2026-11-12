import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { BaseFieldSchema } from '@/schemas/base-field';
import { defineInput } from '@/types';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';
import { cardSpec, cardWizardSpec } from '@/recipes/built-in-specs';
import { getAppearanceAttributes } from '@/lib/appearance';

const noteSchema = z.extend(BaseFieldSchema, { $type: z.literal('note') });
const fieldSetSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('fieldset'),
	elements: z.array(z.looseObject({ $type: z.string() })),
});

const note = defineInput({
	$type: 'note',
	schema: noteSchema,
	appearanceAxes: ['size'],
	metadata: { name: 'Note', category: 'input' },
	render: () => null,
});
const plain = defineInput({
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
		expect(engine.getAppearance().axes).toEqual({
			size: ['compact', 'default', 'comfortable'],
			surface: ['flat', 'outlined', 'elevated'],
		});
	});

	test('a host adds an axis and extends a built-in one', () => {
		const themed = createFormEngine({ appearance: { tone: ['neutral', 'brand'], size: ['dense'] } });
		expect(themed.getAppearance().axes).toEqual({
			size: ['compact', 'default', 'comfortable', 'dense'],
			surface: ['flat', 'outlined', 'elevated'],
			tone: ['neutral', 'brand'],
		});
	});

	test('token values compile into zero-specificity rules scoped by the theme id', () => {
		const themed = createFormEngine({ appearance: { tone: { brand: { '--se-tone-accent': '#f60' } } } });
		const { id, css } = themed.getAppearance();
		expect(css).toContain(`[data-se-appearance-theme="${id}"]`);
		expect(css).toContain('[data-se-tone="brand"]');
		expect(css).toContain('--se-tone-accent:#f60');
		expect(css.startsWith(':where(') || css.includes('\n:where(')).toBe(true);
		expect(css.replaceAll(/:where\([^)]*\)/g, '')).not.toContain('[data-se-');
	});

	test('identical vocabularies share a theme id and different ones do not', () => {
		const a = createFormEngine({ appearance: { tone: ['x'] } }).getAppearance().id;
		expect(createFormEngine({ appearance: { tone: ['x'] } }).getAppearance().id).toBe(a);
		expect(createFormEngine({ appearance: { tone: ['y'] } }).getAppearance().id).not.toBe(a);
	});

	test.each([
		['an axis name that is not a data attribute name', { 'Bad Axis': ['a'] }],
		['an empty value list entry', { tone: [''] }],
		['a value that would break a selector', { tone: ['a"]'] }],
		['a token that is not a custom property', { tone: { brand: { color: 'red' } } }],
	])('rejects %s', (_name, appearance) => {
		expect(() => createFormEngine({ appearance })).toThrowError(/appearance/i);
	});

	test('extend inherits the appearance vocabulary', () => {
		const themed = createFormEngine({ appearance: { tone: ['neutral'] } });
		expect(themed.extend({ elements: [note] }).getAppearance()).toBe(themed.getAppearance());
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

	test('attributes name each axis', () => {
		expect(getAppearanceAttributes({ size: 'compact', surface: 'flat' })).toEqual({
			'data-se-size': 'compact',
			'data-se-surface': 'flat',
		});
		expect(getAppearanceAttributes(undefined)).toEqual({});
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
		expect(() => engine.validateForm(form({ appearance: { size: 3 } }))).toThrowError(/appearance/);
		expect(() =>
			engine.validateForm(form({}, [{ $type: 'note', id: 'n', name: 'n', appearance: { size: 3 } }])),
		).toThrowError(/appearance\.size/);
	});

	test('a host axis the element does not declare fails on that element', () => {
		const themed = createFormEngine({
			elements: [fieldset, note],
			appearance: { tone: ['neutral', 'brand'] },
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
		const toned = defineInput({
			$type: 'toned',
			schema: z.extend(BaseFieldSchema, { $type: z.literal('toned') }),
			appearanceAxes: ['tone'],
			metadata: { name: 'Toned', category: 'input' },
			render: () => null,
		});
		const themed = createFormEngine({ elements: [toned, plain], appearance: { tone: ['neutral', 'brand'] } });
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

	test('a card shell no longer takes maxWidth, padding or shadowSize', () => {
		for (const key of ['maxWidth', 'padding', 'shadowSize']) {
			expect(() => engine.validateForm(cardForm({ shell: { [key]: 'md' } }))).toThrowError();
		}
	});

	test('a slot that declares axes must accept the appearance key', () => {
		expect(() =>
			defineRecipeSpec({
				$type: 'bad',
				kind: 'single-step',
				metadata: { name: 'Bad' },
				slotSchemas: { shell: z.strictObject({}) },
				appearanceAxes: { shell: ['size'] },
			}),
		).toThrowError(/shell.*appearance/);
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
