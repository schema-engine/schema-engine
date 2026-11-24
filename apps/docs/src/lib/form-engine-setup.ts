/** Form engines for the Radiant docs live previews. */
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { createDocsDemoActions } from '@/lib/docs-demo-actions';
import { installMockFormApi } from '@/lib/mock-form-api';
import { BrandFrameRecipe } from '@/lib/examples/brand-frame/brand-frame.radiant';
import { brandTheme } from '@/lib/examples/brand-theme/theme';
import { checkoutEngine, profileEngine } from '@/lib/examples/shared-theme/engines';
import type { FormEngineRuntime } from '@schema-engine/forms';

installMockFormApi();

/**
 * The docs engine. It runs on the same compiled theme as the engines of the layout examples, so every
 * preview of the site carries one `data-se-theme` and the host `tone` axis is available everywhere.
 */
export const formEngine = createRadiantFormEngine({
	elements: schemaFormRegistrations,
	recipes: [BrandFrameRecipe],
	actions: createDocsDemoActions(),
	layout: brandTheme,
});

/** Radiant engines the docs previews can bind. `default` is the docs engine. */
export type DocsEngineName = 'default' | 'checkout' | 'profile';

/** Engines a preview can name with `data-docs-engine`; the preview binding assigns the one it names. */
export const docsEngines: Record<DocsEngineName, FormEngineRuntime> = {
	default: formEngine,
	checkout: checkoutEngine,
	profile: profileEngine,
};
