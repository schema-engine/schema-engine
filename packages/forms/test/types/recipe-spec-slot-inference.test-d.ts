import { expectTypeOf } from 'vitest';
import { defineRecipeSpec } from '@/recipes';
import { CardShellConfigSchema, wizardSpec } from '@/recipes/built-in';

const extendedWizard = defineRecipeSpec({
	$type: 'extended-wizard',
	kind: 'wizard',
	metadata: wizardSpec.metadata,
	slotSchemas: { ...wizardSpec.slotSchemas, shell: CardShellConfigSchema },
	slotDefaults: wizardSpec.slotDefaults,
	appearanceAxes: { shell: ['size', 'surface'] },
});

expectTypeOf(extendedWizard.slotSchemas).toHaveProperty('shell');
expectTypeOf(extendedWizard.slotSchemas).toHaveProperty('header');

defineRecipeSpec({
	$type: 'shell-less-wizard',
	kind: 'wizard',
	metadata: wizardSpec.metadata,
	slotSchemas: wizardSpec.slotSchemas,
	// @ts-expect-error a slot default must name a declared slot
	slotDefaults: { shell: {} },
});

defineRecipeSpec({
	$type: 'shell-less-wizard',
	kind: 'wizard',
	metadata: wizardSpec.metadata,
	slotSchemas: wizardSpec.slotSchemas,
	// @ts-expect-error an appearance axis must name a declared slot
	appearanceAxes: { shell: ['size'] },
});
