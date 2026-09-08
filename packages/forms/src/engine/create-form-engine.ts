import { buildFormEngine } from './build-form-engine';
import type {
	MergedRegistrationMap,
	MergedActionRegistrationMap,
	ElementRegistrationConstraint,
	RecipeRegistrationConstraint,
	ActionRegistrationConstraint,
} from '@/builder/types.utils';
import type { FormEngine } from './form-engine';
import type { SchemaMetadataCatalog } from './schema-metadata-catalog';

export interface CreateFormEngineOptions<
	TElements extends readonly ElementRegistrationConstraint[] = readonly [],
	TRecipes extends readonly RecipeRegistrationConstraint[] = readonly [],
	TActions extends readonly ActionRegistrationConstraint[] = readonly [],
> {
	elements?: TElements;
	recipes?: TRecipes;
	actions?: TActions;
	catalog?: SchemaMetadataCatalog;
}

/** {@link FormEngine} specialization produced from registration lists. */
export type FormEngineFromOptions<
	TElements extends readonly ElementRegistrationConstraint[],
	TRecipes extends readonly RecipeRegistrationConstraint[],
	TActions extends readonly ActionRegistrationConstraint[],
> = FormEngine<
	MergedRegistrationMap<TElements>,
	MergedRegistrationMap<TRecipes>,
	MergedActionRegistrationMap<TActions>
>;

/**
 * Create an immutable {@link FormEngine} from declarative registration arrays.
 *
 * Duplicate `$type` values follow last-wins semantics at runtime. For typing,
 * last-wins applies to tuples and inline arrays; open `T[]` values use a union
 * of configs for the same `$type`. Spread shared barrels and append overrides:
 *
 * ```ts
 * createFormEngine({ elements: [...schemaFormRegistrations, customInput] });
 * ```
 */
export function createFormEngine<
	const TElements extends readonly ElementRegistrationConstraint[] = readonly [],
	const TRecipes extends readonly RecipeRegistrationConstraint[] = readonly [],
	const TActions extends readonly ActionRegistrationConstraint[] = readonly [],
>(
	options?: CreateFormEngineOptions<TElements, TRecipes, TActions>,
): FormEngineFromOptions<TElements, TRecipes, TActions> {
	return buildFormEngine({
		elements: options?.elements,
		recipes: options?.recipes,
		actions: options?.actions,
		catalog: options?.catalog,
	}) as FormEngineFromOptions<TElements, TRecipes, TActions>;
}
