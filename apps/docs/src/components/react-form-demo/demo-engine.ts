import { createFormEngine } from '@schema-engine/forms';
import { demoFormRegistrations } from './demo-registrations.react';
import { demoRecipeRegistrations } from './demo-recipes.react';
import { createDocsDemoActions } from '@/lib/docs-demo-actions';
import { theme } from '@/lib/examples/theming/theme';

/**
 * Docs React engine bound to the Radiant-styled demo kit.
 *
 * @remarks
 * Built on the same compiled theme as the Radiant docs engines (`theme` of the themed form example), so a page that
 * renders both carries one `data-se-theme`.
 *
 * Self-contained inside the docs app source: the dev client transform refuses
 * entrypoints outside `src/`, so the demo graph must not reach into the
 * `registry/shared/` shadcn sources that the package aliases expose. The shadcn
 * example uses a copy of that source under `src/generated/shadcn` instead (see
 * `shadcn-engine.ts`).
 */
export const docsReactFormEngine = createFormEngine({
	elements: demoFormRegistrations,
	recipes: demoRecipeRegistrations,
	actions: createDocsDemoActions(),
	layout: theme,
});
