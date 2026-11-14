import type { FormTaggedConfig } from '@/schemas/form-config';
import { DEFAULT_WIZARD_RECIPE } from '@/lib/form-view';
import { resolveRecipeView } from '@schema-engine/layout';
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

export function parseView(
	authored: FormTaggedConfig | undefined,
	form: { id: string; stepCount: number },
	options: Pick<ValidateFormOptions, 'getRecipe' | 'defaultWizardRecipe' | 'owner'>,
	appearance: AppearanceScope,
): { issues: FormValidationIssue[]; view?: FormTaggedConfig } {
	const { getRecipe } = options;
	const stepCount = form.stepCount;
	let view = authored;
	if (!view) {
		if (stepCount === 0) return { issues: [issueAt(['steps'], 'Form must have at least one step.')] };
		if (stepCount < 2) return { issues: [] };
		const defaultRecipe = options.defaultWizardRecipe ?? DEFAULT_WIZARD_RECIPE;
		if (!getRecipe(defaultRecipe)) {
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

	const recipeType = view.$type;
	if (!recipeType) {
		return { issues: [issueAt(['view', '$type'], 'Must be a non-empty string.')] };
	}

	const recipe = getRecipe(recipeType);
	if (!recipe) {
		return {
			issues: [
				issueAt(
					['view', '$type'],
					`Unknown view recipe '${recipeType}'. Register it with createFormEngine({ recipes: [...] }).`,
				),
			],
		};
	}

	const issues: FormValidationIssue[] = [];
	if (recipe.kind === 'single-step' && stepCount !== 1) {
		issues.push(
			issueAt(
				['view', '$type'],
				`Recipe '${recipeType}' is single-step only (kind: 'single-step') but the form has ${stepCount} steps.`,
			),
		);
	}
	if (recipe.kind === 'wizard' && stepCount < 2) {
		issues.push(
			issueAt(
				['view', '$type'],
				`Recipe '${recipeType}' requires at least 2 steps (kind: 'wizard') but the form has ${stepCount} step(s).`,
			),
		);
	}

	const resolved = resolveRecipeView(recipe, view, appearance);
	issues.push(...resolved.issues.map((issue) => issueAt(['view', ...issue.path], issue.message)));
	if (resolved.schemaIssues) {
		issues.push(...fromSchemaIssues(resolved.schemaIssues, ['view']));
	}
	return { issues, view: isTaggedConfig(resolved.view) ? resolved.view : view };
}
