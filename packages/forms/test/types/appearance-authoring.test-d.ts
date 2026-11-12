import * as z from 'zod/mini';
import { expectTypeOf } from 'vitest';
import { createFormEngine } from '@/engine/create-form-engine';
import { BaseFieldSchema } from '@/schemas/base-field';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';
import { cardSpec } from '@/recipes/built-in-specs';
import { defineInput } from '@/types';
import type { ResolvedAppearanceAxes } from '@/lib/appearance';

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
	appearance: { tone: ['neutral', 'brand'], size: ['dense'] },
});
const element = { $type: 'note' as const, id: 'n', name: 'n' };
const steps = [{ id: 'main', title: 'Main', elements: [element] }];

expectTypeOf<ResolvedAppearanceAxes>().toEqualTypeOf<{
	size: 'compact' | 'default' | 'comfortable';
	surface: 'flat' | 'outlined' | 'elevated';
}>();

engine.defineForm({
	id: 'valid',
	appearance: { size: 'dense', surface: 'outlined', tone: 'brand' },
	steps: [{ ...steps[0], appearance: { size: 'compact' } }],
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
