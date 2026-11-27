import * as v from 'valibot';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';

const ShellSchema = v.strictObject({
	accent: v.optional(v.string(), '#000'),
	appearance: v.optional(v.record(v.string(), v.string())),
});

const brand = defineFormRecipe(
	defineRecipeSpec({
		$type: 'brand',
		kind: 'single-step',
		metadata: { name: 'Brand' },
		slotSchemas: { shell: ShellSchema, header: z.object({ title: z.optional(z.string()) }) },
		appearanceAxes: { shell: ['size'] },
	}),
	{},
);

const engine = createFormEngine({ recipes: [brand] });
const steps = [{ id: 'main', title: 'Main', elements: [] }];

engine.defineForm({ id: 'ok', steps, view: { $type: 'brand', shell: { accent: '#111' } } });
engine.defineForm({ id: 'omitted', steps, view: { $type: 'brand' } });
engine.defineForm({ id: 'zod-slot', steps, view: { $type: 'brand', header: { title: 'Hi' } } });

engine.defineForm({
	id: 'undeclared-slot',
	steps,
	// @ts-expect-error -- the recipe declares no progress slot
	view: { $type: 'brand', progress: {} },
});

engine.defineForm({
	id: 'unknown-key',
	steps,
	// @ts-expect-error -- 'colour' is not a key of the Valibot shell schema
	view: { $type: 'brand', shell: { colour: '#111' } },
});

engine.defineForm({
	id: 'wrong-value',
	steps,
	// @ts-expect-error -- accent is text
	view: { $type: 'brand', shell: { accent: 3 } },
});

defineRecipeSpec({
	$type: 'no-appearance',
	kind: 'single-step',
	metadata: { name: 'No appearance' },
	slotSchemas: { shell: v.strictObject({ accent: v.optional(v.string()) }) },
	// @ts-expect-error -- a slot whose schema has no appearance key cannot declare axes
	appearanceAxes: { shell: ['size'] },
});
