/**
 * Compile-time checks that Radiant's `defineRecipe` ties the payload to the spec's declared slots.
 * Run via: pnpm check-types (tsconfig.test-types.json)
 */

import * as z from 'zod/mini';
import { defineRecipeSpec } from '@schema-engine/forms/recipes';
import { defineRecipe } from '@/recipes';

const Shell = () => null;
const Slot = () => null;

const withHeader = defineRecipeSpec({
	$type: 'with-header',
	kind: 'single-step',
	metadata: { name: 'With header', description: 'Declares shell and header' },
	slotSchemas: { shell: z.strictObject({}), header: z.strictObject({}) },
});

const singleStep = defineRecipeSpec({
	$type: 'plain',
	kind: 'single-step',
	metadata: { name: 'Plain', description: 'Declares shell and actions' },
	slotSchemas: { shell: z.strictObject({}), actions: z.strictObject({}) },
});

defineRecipe(withHeader, { shell: Shell, slots: { header: Slot } });

defineRecipe(
	withHeader,
	// @ts-expect-error -- header is declared, so the payload must provide it
	{ shell: Shell, slots: {} },
);

defineRecipe(
	singleStep,
	// @ts-expect-error -- single-step spec declares no progress slot
	{ shell: Shell, slots: { actions: Slot, progress: Slot } },
);

defineRecipe(
	withHeader,
	// @ts-expect-error -- the spec declares a shell, so the payload must provide it
	{ slots: { header: Slot } },
);
