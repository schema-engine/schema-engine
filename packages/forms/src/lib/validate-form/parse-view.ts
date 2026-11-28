import type { FormTaggedConfig } from '@/schemas/form-config';
import { DEFAULT_WIZARD_RECIPE } from '@/lib/form-view';
import { resolveRecipeView, type RecipeViewInput } from '@schema-engine/layout';
import { safeParseNode, standardSchema, type NodeLookup, type StandardSchemaIssue } from '@schema-engine/registry';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { AnyRecipeRegistration } from '@/types/registration';
import { logger } from '@/lib/logger';
import type { AppearanceScope } from '@/lib/resolve-appearance';
import { issueAt, isTaggedConfig, type FormValidationIssue } from './issues';
import type { ValidateFormOptions } from './options';
import { fromSchemaIssues } from './schema-issues';

/**
 * Form ids already warned about, per owner.
 *
 * @remarks
 * A renderer re-validates an inline raw config on every render, so the missing-recipe warning
 * would otherwise repeat for the same form.
 */
const warnedMissingWizardRecipe = new WeakMap<object, Set<string>>();

/**
 * Finds a recipe by the `$type` of the view, with what holds a view of that recipe ({@link viewSchema}).
 *
 * @remarks
 * `safeParseNode` runs the schema only once it has found the recipe, so the view is an object with a registered
 * `$type`. Its issues are relative to the view.
 */
function recipeLookup(
	recipes: ValidateFormOptions['recipes'],
	stepCount: number,
	appearance: AppearanceScope,
): NodeLookup<{ schema: StandardSchemaV1 }> {
	return {
		get(type) {
			const recipe = recipes.get(type);
			return recipe && { schema: viewSchema(recipe, stepCount, appearance) };
		},
		hint: recipes.hint,
	};
}

/**
 * The schema of a view: the recipe's kind against the number of steps, then the view as `resolveRecipeView` resolves it.
 *
 * @remarks
 * The `value as RecipeViewInput` cast relies on the lookup contract: {@link recipeLookup} hands this schema only to
 * `safeParseNode`, which runs it after it has checked that the view is an object with a string `$type`.
 */
function viewSchema(recipe: AnyRecipeRegistration, stepCount: number, appearance: AppearanceScope): StandardSchemaV1 {
	return standardSchema((value) => {
		const issues: StandardSchemaIssue[] = [];
		if (recipe.kind === 'single-step' && stepCount !== 1) {
			issues.push({
				path: ['$type'],
				message: `Recipe '${recipe.$type}' is single-step only (kind: 'single-step') but the form has ${stepCount} steps.`,
			});
		}
		if (recipe.kind === 'wizard' && stepCount < 2) {
			issues.push({
				path: ['$type'],
				message: `Recipe '${recipe.$type}' requires at least 2 steps (kind: 'wizard') but the form has ${stepCount} step(s).`,
			});
		}
		const resolved = resolveRecipeView(recipe, value as RecipeViewInput, appearance);
		issues.push(...resolved.issues, ...(resolved.schemaIssues ?? []));
		return issues.length > 0 ? { issues } : { value: resolved.view };
	});
}

export function parseView(
	authored: FormTaggedConfig | undefined,
	form: { id: string; stepCount: number },
	options: Pick<ValidateFormOptions, 'recipes' | 'defaultWizardRecipe' | 'owner'>,
	appearance: AppearanceScope,
): { issues: FormValidationIssue[]; view?: FormTaggedConfig } {
	const { recipes } = options;
	const stepCount = form.stepCount;
	let view = authored;
	if (!view) {
		if (stepCount === 0) return { issues: [issueAt(['steps'], 'Form must have at least one step.')] };
		if (stepCount < 2) return { issues: [] };
		const defaultRecipe = options.defaultWizardRecipe ?? DEFAULT_WIZARD_RECIPE;
		if (!recipes.get(defaultRecipe)) {
			const warned = warnedMissingWizardRecipe.get(options.owner) ?? new Set<string>();
			warnedMissingWizardRecipe.set(options.owner, warned);
			if (warned.has(form.id)) return { issues: [] };
			warned.add(form.id);
			logger.warn(
				`Form '${form.id}' has ${stepCount} steps but no '${defaultRecipe}' recipe is registered. The form renders every step on a single page without a view layout. Register a wizard recipe with createFormEngine({ recipes: [...] }) or set an explicit view.$type.`,
			);
			return { issues: [] };
		}
		view = { $type: defaultRecipe };
	}

	const parsed = safeParseNode(recipeLookup(recipes, form.stepCount, appearance), view, { path: ['view'] });
	if (!parsed.success) return { issues: fromSchemaIssues(parsed.issues, []) };
	return { issues: [], view: isTaggedConfig(parsed.data) ? parsed.data : view };
}
