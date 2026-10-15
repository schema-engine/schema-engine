import type { AnyRecipeRegistration } from '@/types/registration';
import type { FormConfigView, NormalizedFormConfig } from '@/lib/normalized-form-config';
import { logger } from '@/lib/logger';

/** Implicit `view.$type` for multi-step forms that omit `view`. */
export const DEFAULT_WIZARD_RECIPE = 'bare-controls';

/**
 * Engine-shaped lookup passed to {@link resolveFormRecipe}.
 *
 * Pass the `FormEngine` instance (or a stable `{ getRecipe }` object). Object
 * identity is the warn-cache key: a new lambda every render will warn on every
 * render.
 */
export interface RecipeLookup {
	getRecipe: (id: string) => AnyRecipeRegistration | undefined;
}

/** Getter form still accepted so a `(id) => engine.getRecipe(id)` lambda does not crash. */
export type RecipeGetter = RecipeLookup['getRecipe'];

export type RecipeResolver = RecipeLookup | RecipeGetter;

/** Per-engine form ids already warned, so re-renders of the same engine do not spam. */
const warnedMultiStepForms = new WeakMap<object, Set<string>>();

function isRecipeLookup(lookup: RecipeResolver): lookup is RecipeLookup {
	return typeof lookup === 'object' && lookup !== null && typeof lookup.getRecipe === 'function';
}

function getRecipeFromLookup(lookup: RecipeResolver | undefined, id: string) {
	if (!lookup) return undefined;
	if (typeof lookup === 'function') return lookup(id);
	if (isRecipeLookup(lookup)) return lookup.getRecipe(id);
	return undefined;
}

function assertRecipeResolver(lookup: RecipeResolver): void {
	if (typeof lookup === 'function' || isRecipeLookup(lookup)) return;
	throw new Error(
		'The supplied engine has no getRecipe(). Pass a live FormEngine instance — class methods do not survive HTML attributes or Storybook arg serialization.',
	);
}

function warnMissingDefaultWizard(lookup: object, config: FormConfigView) {
	let warned = warnedMultiStepForms.get(lookup);
	if (!warned) {
		warned = new Set();
		warnedMultiStepForms.set(lookup, warned);
	}
	if (warned.has(config.id)) return;
	warned.add(config.id);
	logger.warn(
		`Form '${config.id}' has ${config.steps.length} steps but no '${DEFAULT_WIZARD_RECIPE}' recipe is registered. The form renders every step on a single page without a view layout. Register a wizard recipe with createFormEngine({ recipes: [...] }) or set an explicit view.$type.`,
	);
}

/**
 * Resolves the view recipe for a form at render time.
 *
 * - Explicit `view.$type`: looks up that recipe. Throws if `lookup` is missing
 *   or the type is unregistered. `lookup` may be a FormEngine, `{ getRecipe }`,
 *   or a `(id) => recipe` getter.
 * - No `view`, one step or fewer: returns `undefined` (fields only).
 * - No `view`, two or more steps: looks up {@link DEFAULT_WIZARD_RECIPE}.
 * - Engine present but that recipe is missing: warns once per engine/form id
 *   and returns `undefined`. `validateForm` / `defineForm` still succeed.
 * - No `lookup` (engine-less render): stays silent and returns `undefined`.
 */
export function resolveFormRecipe(config: FormConfigView, lookup?: RecipeResolver): AnyRecipeRegistration | undefined {
	const requestedType = config.view?.$type;
	if (requestedType) {
		if (!lookup) {
			throw new Error(`Form '${config.id}' uses view '${requestedType}' but no FormEngine was supplied.`);
		}
		assertRecipeResolver(lookup);
		const recipe = getRecipeFromLookup(lookup, requestedType);
		if (!recipe) {
			throw new Error(
				`Unknown view recipe '${requestedType}'. Register it with createFormEngine({ recipes: [...] }).`,
			);
		}
		return recipe;
	}

	if (config.steps.length <= 1) return undefined;
	if (!lookup) return undefined;

	assertRecipeResolver(lookup);
	const recipe = getRecipeFromLookup(lookup, DEFAULT_WIZARD_RECIPE);
	if (recipe) return recipe;

	warnMissingDefaultWizard(lookup, config);
	return undefined;
}

/**
 * Steps to paint for a resolved recipe.
 *
 * A recipe owns wizard navigation, so only the current step is rendered.
 * Without a recipe, every step is flattened onto one page so later fields stay reachable.
 */
export function getRenderableSteps<T extends FormConfigView>(
	config: T,
	recipe: AnyRecipeRegistration | undefined,
	currentStep: number,
): T['steps'] {
	if (recipe) {
		const step = config.steps[currentStep] ?? config.steps[0];
		return step ? [step] : [];
	}
	return config.steps;
}

/**
 * Assert an engine is available to normalize authoring input or JSON.
 *
 * The canonical entry point for render hosts (React `FormRenderer`, Radiant
 * `FormProvider`): normalize once at the boundary, then pass the frozen
 * {@link NormalizedFormConfig} down. Renderers must not accept authoring input.
 */
export function assertFormEngine<E extends { validateForm: (config: unknown) => NormalizedFormConfig }>(
	engine: E | undefined,
	config: FormConfigView,
): asserts engine is E {
	if (!engine) {
		throw new Error(
			config.view?.$type
				? `Form '${config.id}' uses view '${config.view.$type}' but no FormEngine was supplied.`
				: `Form '${config.id}' cannot be normalized without a FormEngine.`,
		);
	}
}
