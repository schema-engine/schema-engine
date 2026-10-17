import { buildFormEngine } from './build-form-engine';
import type {
	MergedRegistrationMap,
	MergedOutputMap,
	MergedActionRegistrationMap,
	ElementRegistrationConstraint,
	RecipeRegistrationConstraint,
	ActionRegistrationConstraint,
} from '@/builder/types.utils';
import type { FormEngine } from './form-engine';
import type { SchemaMetadataCatalog } from './schema-metadata-catalog';
import type { GridThemeOptions } from '@/lib/grid-styles';

export interface CreateFormEngineOptions<
	TElements extends readonly ElementRegistrationConstraint[] = readonly [],
	TRecipes extends readonly RecipeRegistrationConstraint[] = readonly [],
	TActions extends readonly ActionRegistrationConstraint[] = readonly [],
> {
	elements?: TElements;
	recipes?: TRecipes;
	actions?: TActions;
	/**
	 * Extra schema metadata entries. The engine copies the catalog and writes every
	 * registration's entry over it, so an entry with a registration's id is replaced.
	 */
	catalog?: SchemaMetadataCatalog;
	/** Engine-level grid vocabulary: breakpoint thresholds, gap tokens, default min column width. */
	grid?: GridThemeOptions;
}

/** Options for {@link FormEngine.extend}; grid theme is always inherited from the source engine. */
export type ExtendFormEngineOptions<
	TElements extends readonly ElementRegistrationConstraint[] = readonly [],
	TRecipes extends readonly RecipeRegistrationConstraint[] = readonly [],
	TActions extends readonly ActionRegistrationConstraint[] = readonly [],
> = Omit<CreateFormEngineOptions<TElements, TRecipes, TActions>, 'grid'>;

/** {@link FormEngine} specialization produced from registration lists. */
export type FormEngineFromOptions<
	TElements extends readonly ElementRegistrationConstraint[],
	TRecipes extends readonly RecipeRegistrationConstraint[],
	TActions extends readonly ActionRegistrationConstraint[],
> = FormEngine<
	MergedRegistrationMap<TElements>,
	MergedRegistrationMap<TRecipes>,
	MergedActionRegistrationMap<TActions>,
	{ elements: MergedOutputMap<TElements>; recipes: MergedOutputMap<TRecipes>; actions: MergedOutputMap<TActions> }
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
		grid: options?.grid,
	}) as unknown as FormEngineFromOptions<TElements, TRecipes, TActions>;
}
