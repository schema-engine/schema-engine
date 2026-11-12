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
import type { LayoutAxes, LayoutInput } from '@schema-engine/layout';

export interface CreateFormEngineOptions<
	TElements extends readonly ElementRegistrationConstraint[] = readonly [],
	TRecipes extends readonly RecipeRegistrationConstraint[] = readonly [],
	TActions extends readonly ActionRegistrationConstraint[] = readonly [],
	TLayout extends LayoutInput = Record<never, never>,
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
	/**
	 * The layout theme: a compiled theme from `createLayoutTheme`, or inline `{ grid, appearance }` options.
	 *
	 * @remarks
	 * `grid` is the grid vocabulary (breakpoint thresholds, gap tokens, default min column width).
	 * `appearance` is the named axes a form picks values on, over the built-in `size`
	 * (`compact | default | comfortable`) and `surface` (`flat | outlined | elevated`); an axis lists
	 * its values by name, or maps each value to the CSS custom properties it sets. Elements and
	 * recipe slots declare which axes they support.
	 *
	 * Pass one compiled theme to several engines and they share its `data-se-theme` and stylesheet,
	 * so an embedded form matches its page. Inline options compile a theme of the engine's own, with
	 * the renderer's `data-se-*` attribute names reserved so an axis cannot reuse one.
	 * {@link FormEngine.extend} inherits it.
	 */
	layout?: TLayout;
}

/** Options for {@link FormEngine.extend}; layout theme and default wizard recipe are always inherited from the source engine. */
export type ExtendFormEngineOptions<
	TElements extends readonly ElementRegistrationConstraint[] = readonly [],
	TRecipes extends readonly RecipeRegistrationConstraint[] = readonly [],
	TActions extends readonly ActionRegistrationConstraint[] = readonly [],
> = Omit<CreateFormEngineOptions<TElements, TRecipes, TActions>, 'layout' | 'defaultWizardRecipe'>;

/** {@link FormEngine} specialization produced from registration lists. */
export type FormEngineFromOptions<
	TElements extends readonly ElementRegistrationConstraint[],
	TRecipes extends readonly RecipeRegistrationConstraint[],
	TActions extends readonly ActionRegistrationConstraint[],
	TLayout extends LayoutInput = Record<never, never>,
> = FormEngine<
	MergedRegistrationMap<TElements>,
	MergedRegistrationMap<TRecipes>,
	MergedActionRegistrationMap<TActions>,
	{ elements: MergedOutputMap<TElements>; recipes: MergedOutputMap<TRecipes>; actions: MergedOutputMap<TActions> },
	LayoutAxes<TLayout>
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
	const TLayout extends LayoutInput = Record<never, never>,
>(
	options?: CreateFormEngineOptions<TElements, TRecipes, TActions, TLayout>,
): FormEngineFromOptions<TElements, TRecipes, TActions, TLayout> {
	return buildFormEngine({
		elements: options?.elements,
		recipes: options?.recipes,
		actions: options?.actions,
		catalog: options?.catalog,
		layout: options?.layout,
		defaultWizardRecipe: options?.defaultWizardRecipe,
	}) as unknown as FormEngineFromOptions<TElements, TRecipes, TActions, TLayout>;
}
