import { createFormEngine } from '@schema-engine/forms';
import { rhfAdapter } from '@schema-engine/forms-react/adapters/react-hook-form';
import { demoFormRegistrations } from './demo-registrations.react';
import { demoRecipeRegistrations } from './demo-recipes.react';
import { createDocsDemoActions } from '@/lib/docs-demo-actions';
import { BrandFrameRecipe } from '@/lib/recipes/brand-frame.react';
import { brandTheme } from '@/lib/recipes/brand-theme';

/**
 * Docs React engine bound to the Radiant-styled demo kit.
 *
 * @remarks
 * Built on the same compiled theme as the Radiant docs engines (`brandTheme`), so a page that
 * renders both carries one `data-se-theme`.
 *
 * Self-contained inside the docs app source: the dev client transform refuses
 * entrypoints outside `src/`, so the demo graph must not reach into the
 * `registry/shared/` shadcn sources that the package aliases expose. The shadcn
 * example uses a copy of that source under `src/generated/shadcn` instead (see
 * `shadcn-engine.ts`). The
 * adapter imports from `@schema-engine/forms-react/adapters/react-hook-form`,
 * the subpath that keeps `react-hook-form` an optional peer.
 */
export const docsReactFormEngine = createFormEngine({
	elements: demoFormRegistrations,
	recipes: [...demoRecipeRegistrations, BrandFrameRecipe],
	actions: createDocsDemoActions(),
	layout: brandTheme,
});

export { rhfAdapter };
