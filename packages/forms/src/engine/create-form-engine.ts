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
import type { AppearanceOptions, ResolvedAppearanceAxes } from '@/lib/appearance';

export interface CreateFormEngineOptions<
	TElements extends readonly ElementRegistrationConstraint[] = readonly [],
	TRecipes extends readonly RecipeRegistrationConstraint[] = readonly [],
	TActions extends readonly ActionRegistrationConstraint[] = readonly [],
	TAppearance extends AppearanceOptions = Record<never, never>,
> {
	elements?: TElements;
	recipes?: TRecipes;
	actions?: TActions;
	/**
	 * Extra schema metadata entries. The engine copies the catalog and writes every
	 * registration's entry over it, so an entry with a registration's id is replaced.
	 */
	catalog?: SchemaMetadataCatalog;
	/**
	 * Recipe `validateForm` writes as `view` for a multi-step form that omits one. Defaults to `'bare-controls'`.
	 *
	 * @remarks
	 * Must name a registered `wizard`-kind recipe, or the engine build throws. {@link FormEngine.extend}
	 * inherits it. Without this option and without a registered `bare-controls`, a multi-step form
	 * without `view` stays without one and `validateForm` warns.
	 */
	defaultWizardRecipe?: string;
	/** Engine-level grid vocabulary: breakpoint thresholds, gap tokens, default min column width. */
	grid?: GridThemeOptions;
	/**
	 * Engine-level appearance vocabulary: the named axes a form picks values on, over the built-in
	 * `size` (`compact | default | comfortable`) and `surface` (`flat | outlined | elevated`).
	 *
	 * @remarks
	 * An axis lists its values by name, or maps each value to the CSS custom properties it sets.
	 * Listing more values for a built-in axis extends it. Elements and recipe slots declare which axes
	 * they support. {@link FormEngine.extend} inherits it.
	 */
	appearance?: TAppearance;
}

/** Options for {@link FormEngine.extend}; grid theme, appearance vocabulary and default wizard recipe are always inherited from the source engine. */
export type ExtendFormEngineOptions<
	TElements extends readonly ElementRegistrationConstraint[] = readonly [],
	TRecipes extends readonly RecipeRegistrationConstraint[] = readonly [],
	TActions extends readonly ActionRegistrationConstraint[] = readonly [],
> = Omit<CreateFormEngineOptions<TElements, TRecipes, TActions>, 'grid' | 'appearance' | 'defaultWizardRecipe'>;

/** {@link FormEngine} specialization produced from registration lists. */
export type FormEngineFromOptions<
	TElements extends readonly ElementRegistrationConstraint[],
	TRecipes extends readonly RecipeRegistrationConstraint[],
	TActions extends readonly ActionRegistrationConstraint[],
	TAppearance extends AppearanceOptions = Record<never, never>,
> = FormEngine<
	MergedRegistrationMap<TElements>,
	MergedRegistrationMap<TRecipes>,
	MergedActionRegistrationMap<TActions>,
	{ elements: MergedOutputMap<TElements>; recipes: MergedOutputMap<TRecipes>; actions: MergedOutputMap<TActions> },
	ResolvedAppearanceAxes<TAppearance>
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
	const TAppearance extends AppearanceOptions = Record<never, never>,
>(
	options?: CreateFormEngineOptions<TElements, TRecipes, TActions, TAppearance>,
): FormEngineFromOptions<TElements, TRecipes, TActions, TAppearance> {
	return buildFormEngine({
		elements: options?.elements,
		recipes: options?.recipes,
		actions: options?.actions,
		catalog: options?.catalog,
		grid: options?.grid,
		appearance: options?.appearance,
		defaultWizardRecipe: options?.defaultWizardRecipe,
	}) as unknown as FormEngineFromOptions<TElements, TRecipes, TActions, TAppearance>;
}
