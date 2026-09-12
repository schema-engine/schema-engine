/** @jsxImportSource react */
import { createReactFormEngine, rhfAdapter } from '@schema-engine/forms-react';
import { demoFormRegistrations } from './demo-registrations.react';
import { demoRecipeRegistrations } from './demo-recipes.react';
import { createDocsDemoActions } from '@/lib/docs-demo-actions';

import '@schema-engine/forms/schemas/validation/validation-registry';

/**
 * Docs React engine bound to the Radiant-styled demo kit.
 *
 * @remarks
 * Self-contained inside the docs app source: the dev client transform refuses
 * entrypoints outside `src/`, so the demo graph must not reach into the
 * `registry/shared/` shadcn sources that the package aliases expose. The
 * adapter imports through the package root so dev vendoring keeps one module
 * instance for the form contexts.
 */
export const docsReactFormEngine = createReactFormEngine({
	elements: demoFormRegistrations,
	recipes: demoRecipeRegistrations,
	actions: createDocsDemoActions(),
});

export { rhfAdapter };
