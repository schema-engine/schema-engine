import { createFormEngine } from '@schema-engine/forms';
import { rhfAdapter } from '@schema-engine/forms-react/adapters/react-hook-form';
import { demoFormRegistrations } from './demo-registrations.react';
import { demoRecipeRegistrations } from './demo-recipes.react';
import { createDocsDemoActions } from '@/lib/docs-demo-actions';

/**
 * Docs React engine bound to the Radiant-styled demo kit.
 *
 * @remarks
 * Self-contained inside the docs app source: the dev client transform refuses
 * entrypoints outside `src/`, so the demo graph must not reach into the
 * `registry/shared/` shadcn sources that the package aliases expose. The
 * adapter imports from `@schema-engine/forms-react/adapters/react-hook-form`,
 * the subpath that keeps `react-hook-form` an optional peer.
 */
export const docsReactFormEngine = createFormEngine({
	elements: demoFormRegistrations,
	recipes: demoRecipeRegistrations,
	actions: createDocsDemoActions(),
});

export { rhfAdapter };
