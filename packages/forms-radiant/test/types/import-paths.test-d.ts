/**
 * Compile-time checks of the symbols that moved to their owner in the one-import-path change, for the entries this
 * package can reach: `@schema-engine/forms-radiant`, `@schema-engine/forms` and `@schema-engine/forms/recipes`.
 * `@schema-engine/forms-react` is not a dependency of this package, so the old paths of its two entries are checked in
 * its own `test/types/import-paths.test-d.ts`.
 *
 * Each moved name is imported at its owner, and each old path is read with `@ts-expect-error`, which fails when the
 * old path still exports the name. A type has no key in `typeof import(...)`, so only a member access checks one.
 * Run via: pnpm check-types (tsconfig.test-types.json)
 */

import { defineRecipe } from '@schema-engine/forms-radiant';
import { formatIssuePath } from '@schema-engine/registry';
import { DEFAULT_WIZARD_RECIPE } from '@schema-engine/forms';
import type { FormSubmissionState, FormSubmitHelpers, FormValues, SubmissionStatus } from '@schema-engine/forms';
import { defineRecipeSpec } from '@schema-engine/forms/recipes';
import type { RecipeSlotSchemas, ViewModel, ViewNavigation, ViewStep } from '@schema-engine/forms/recipes';
import type { RecipeMetadata, RecipeSlotDefaults, RecipeViewSchema } from '@schema-engine/layout';
import { FORM_ROOT } from '@schema-engine/forms/state-container';
import type {
	FieldArrayValue,
	FormIssueFormatter,
	FormStateError,
	FormStateErrorsInput,
	FormStateIssue,
	FormSubmissionIssue,
} from '@schema-engine/forms/state-container';

export type Moved = [
	RecipeMetadata,
	RecipeSlotDefaults<RecipeSlotSchemas>,
	RecipeViewSchema<'recipe', RecipeSlotSchemas>,
	FormSubmissionState,
	FormSubmitHelpers,
	FormValues,
	SubmissionStatus,
	ViewModel,
	ViewNavigation,
	ViewStep,
	FieldArrayValue,
	FormIssueFormatter,
	FormStateError,
	FormStateErrorsInput,
	FormStateIssue,
	FormSubmissionIssue,
];

export const owners = [defineRecipe, defineRecipeSpec, DEFAULT_WIZARD_RECIPE, FORM_ROOT, formatIssuePath];

type Radiant = typeof import('@schema-engine/forms-radiant');
type Forms = typeof import('@schema-engine/forms');

// @ts-expect-error `defineRecipeSpec` is exported by `@schema-engine/forms/recipes` alone.
export type RadiantDefineRecipeSpec = Radiant['defineRecipeSpec'];
// @ts-expect-error `DEFAULT_WIZARD_RECIPE` is exported by `@schema-engine/forms` alone.
export type RadiantDefaultWizardRecipe = Radiant['DEFAULT_WIZARD_RECIPE'];
// @ts-expect-error `formatIssuePath` is exported by `@schema-engine/registry` alone.
export type FormsFormatIssuePath = Forms['formatIssuePath'];
// @ts-expect-error `RecipeMetadata` is exported by `@schema-engine/layout` alone.
export type RecipesRecipeMetadata = import('@schema-engine/forms/recipes').RecipeMetadata;
// @ts-expect-error `RecipeSlotDefaults` is exported by `@schema-engine/layout` alone.
export type RecipesRecipeSlotDefaults = import('@schema-engine/forms/recipes').RecipeSlotDefaults<RecipeSlotSchemas>;
// @ts-expect-error `RecipeViewSchema` is exported by `@schema-engine/layout` alone.
export type RecipesRecipeViewSchema = import('@schema-engine/forms/recipes').RecipeViewSchema<
	'recipe',
	RecipeSlotSchemas
>;
