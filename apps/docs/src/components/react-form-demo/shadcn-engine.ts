import { createFormEngine } from '@schema-engine/forms';
import { InputElementRegistration } from '@/generated/shadcn/components/schema-engine/forms/inputs/form-input.registration';
import { CardRecipe } from '@/generated/shadcn/components/schema-engine/forms/recipes/registrations/card';
import { brandTheme } from '@/lib/recipes/brand-theme';

/**
 * Docs React engine built from the shadcn registry source, copied into the docs app (see `scripts/copy-registry-demo.ts` for how it differs from a real install).
 *
 * @remarks
 * The files under `@/generated/shadcn` are written by `scripts/copy-registry-demo.ts` before dev and
 * build. Provider and hooks resolve `@schema-engine/forms-react` through its package exports, as a
 * consumer's copy does, so they share one React context with the renderer.
 */
export const docsShadcnFormEngine = createFormEngine({
	elements: [InputElementRegistration],
	recipes: [CardRecipe],
	layout: brandTheme,
});
