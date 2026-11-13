import type * as z from 'zod/mini';

/**
 * What every recipe renderer receives, whatever the domain: the recipe's kind and the resolved view.
 *
 * @remarks
 * A domain extends it with what its renderers also need, for example the steps of a form.
 */
export interface RecipeViewModel<TKind extends string = string> {
	kind: TKind;
	viewConfig: Record<string, unknown>;
}

/**
 * Reads one slot's complete config from a resolved view.
 *
 * @remarks
 * `schema` only types the result. The view is already complete, and parsing it again with the
 * block's own strict schema would reject a custom recipe whose slot schema extends the block's
 * with extra keys.
 */
export function readSlotConfig<TSchema extends z.ZodMiniType>(
	viewConfig: Record<string, unknown>,
	slot: string,
	_schema: TSchema,
): z.output<TSchema> {
	return viewConfig[slot] as z.output<TSchema>;
}
