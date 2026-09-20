import type { z } from 'zod/mini';
import type { RecipeRegistration } from '@/types';
import type { RecipeSlot, RecipeSpec } from './types';

/**
 * Binds a recipe spec to a framework render payload (shell and slot components).
 *
 * Specs are canonical in this package. React implementations typically come
 * from the Schema Engine registry; Radiant binds its own payload in-package.
 */
export function defineFormRecipe<
	const TType extends string,
	TSlots extends Partial<Record<RecipeSlot, z.ZodMiniType>>,
	TSchema extends z.ZodMiniType,
	TRender,
>(spec: RecipeSpec<TType, TSchema, TSlots>, render: TRender): RecipeRegistration<TType, TSchema, TRender> {
	return {
		$type: spec.$type,
		kind: spec.kind,
		slots: spec.slots,
		schema: spec.schema,
		metadata: spec.metadata,
		slotDefaults: spec.slotDefaults,
		render,
	} as RecipeRegistration<TType, TSchema, TRender>;
}
