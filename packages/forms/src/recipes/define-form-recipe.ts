import type { z } from 'zod';
import type { RecipeRegistration } from '@/types';
import type { RecipeSpec } from './types';

/**
 * Binds a recipe spec to a framework render payload (shell and slot components).
 *
 * Specs are canonical in this package. React implementations typically come
 * from the Schema Engine registry; Radiant binds its own payload in-package.
 */
export function defineFormRecipe<const TType extends string, TSchema extends z.ZodType, TRender>(
	spec: RecipeSpec<TType, TSchema>,
	render: TRender,
): RecipeRegistration<TType, TSchema, TRender> {
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
