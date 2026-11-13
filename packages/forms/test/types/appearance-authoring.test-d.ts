import * as z from 'zod/mini';
import { expectTypeOf } from 'vitest';
import { createFormEngine } from '@/engine/create-form-engine';
import { BaseFieldSchema } from '@/schemas/base-field';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';
import { cardSpec } from '@/recipes/built-in-specs';
import { defineInput } from '@/types';
import { builtInAxes, createLayoutTheme, defineAxis, type ResolvedAppearanceAxes } from '@schema-engine/layout';

const tone = defineAxis({
	$type: 'tone',
	metadata: { name: 'Tone' },
	default: 'neutral',
	values: { neutral: {}, brand: {} },
});
const spacing = defineAxis({
	$type: 'size',
	metadata: { name: 'Size' },
	default: 'dense',
	values: { dense: {}, airy: {} },
});

const note = defineInput({
	$type: 'note',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('note') }),
	appearanceAxes: ['size'],
	metadata: { name: 'Note', category: 'input' },
	render: () => null,
});

const engine = createFormEngine({
	elements: [note],
	recipes: [defineFormRecipe(cardSpec, {})],
	layout: { appearance: [...builtInAxes, tone] },
});
const element = { $type: 'note' as const, id: 'n', name: 'n' };
const steps = [{ id: 'main', title: 'Main', elements: [element] }];

expectTypeOf<ResolvedAppearanceAxes>().toEqualTypeOf<{
	size: 'compact' | 'default' | 'comfortable';
	surface: 'flat' | 'outlined' | 'elevated';
}>();

engine.defineForm({
	id: 'valid',
	appearance: { size: 'compact', surface: 'outlined', tone: 'brand' },
	steps: [{ ...steps[0], appearance: { size: 'comfortable' } }],
	view: { $type: 'card', shell: { appearance: { surface: 'elevated' } } },
});

engine.defineForm({
	id: 'form-value',
	// @ts-expect-error -- 'elevatd' is not a surface value
	appearance: { surface: 'elevatd' },
	steps,
});

engine.defineForm({
	id: 'form-axis',
	// @ts-expect-error -- no axis named 'density'
	appearance: { density: 'high' },
	steps,
});

engine.defineForm({
	id: 'step-value',
	// @ts-expect-error -- 'huge' is not a size value
	steps: [{ ...steps[0], appearance: { size: 'huge' } }],
});

engine.defineForm({
	id: 'field-value',
	// @ts-expect-error -- 'tiny' is not a size value
	steps: [{ ...steps[0], elements: [{ ...element, appearance: { size: 'tiny' } }] }],
});

engine.defineForm({
	id: 'slot-value',
	steps,
	view: {
		$type: 'card',
		// @ts-expect-error -- 'elevatd' is not a surface value
		shell: { appearance: { surface: 'elevatd' } },
	},
});

engine.defineForm({
	id: 'slot-axis',
	steps,
	view: {
		$type: 'card',
		// @ts-expect-error -- no axis named 'density'
		shell: { appearance: { density: 'high' } },
	},
});

const bareSpec = defineRecipeSpec({
	$type: 'bare',
	kind: 'single-step',
	metadata: { name: 'Bare' },
	slotSchemas: { shell: z.strictObject({ appearance: z.optional(z.record(z.string(), z.string())) }) },
	appearanceAxes: { shell: ['size'] },
});
void bareSpec;

engine.defineForm({
	id: 'form-mixed',
	// @ts-expect-error -- 'density' is not an axis, even beside a known one
	appearance: { size: 'compact', density: 'high' },
	steps,
});

engine.defineForm({
	id: 'step-mixed',
	// @ts-expect-error -- 'density' is not an axis, even beside a known one
	steps: [{ ...steps[0], appearance: { size: 'compact', density: 'high' } }],
});

engine.defineForm({
	id: 'field-mixed',
	// @ts-expect-error -- 'density' is not an axis, even beside a known one
	steps: [{ ...steps[0], elements: [{ ...element, appearance: { size: 'compact', density: 'high' } }] }],
});

engine.defineForm({
	id: 'slot-mixed',
	steps,
	view: {
		$type: 'card',
		// @ts-expect-error -- 'density' is not an axis, even beside a known one
		shell: { appearance: { surface: 'elevated', density: 'high' } },
	},
});

const sharedTheme = createLayoutTheme({ appearance: [...builtInAxes, tone, spacing] });
const sharedEngine = createFormEngine({ elements: [note], layout: sharedTheme });

sharedEngine.defineForm({
	id: 'compiled-theme',
	appearance: { size: 'dense', tone: 'brand' },
	steps,
});

sharedEngine.defineForm({
	id: 'compiled-theme-value',
	// @ts-expect-error -- 'loud' is not a tone value of the compiled theme
	appearance: { tone: 'loud' },
	steps,
});

sharedEngine.defineForm({
	id: 'replaced-axis-value',
	// @ts-expect-error -- 'compact' belongs to the built-in size, which the later size axis replaced
	appearance: { size: 'compact' },
	steps,
});

expectTypeOf<ResolvedAppearanceAxes<[typeof tone, typeof spacing]>>().toEqualTypeOf<{
	tone: 'neutral' | 'brand';
	size: 'dense' | 'airy';
}>();
