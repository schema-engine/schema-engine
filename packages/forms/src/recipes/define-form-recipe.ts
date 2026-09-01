import { asStandardSchema } from '@/lib/standard-schema';
import type { z } from 'zod';
import type { RecipeRegistration } from '@/types';
import type { RecipeSpec } from './types';

export function defineFormRecipe<TType extends string, TSchema extends z.ZodTypeAny, TRender>(
	spec: RecipeSpec<TType, TSchema>,
	render: TRender,
): RecipeRegistration<TType, z.infer<TSchema>, TRender> {
	return {
		$type: spec.$type,
		kind: spec.kind,
		slots: spec.slots,
		schema: asStandardSchema(spec.schema),
		metadata: spec.metadata,
		slotDefaults: spec.slotDefaults,
		render,
	} as RecipeRegistration<TType, z.infer<TSchema>, TRender>;
}
