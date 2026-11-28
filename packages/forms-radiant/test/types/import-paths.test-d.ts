/**
 * Compile-time checks that every symbol has one import path, its owner's. The imports are the "after" block of the
 * migration in the changeset, so a moved symbol that is not exported where the changeset says breaks `check-types`.
 * Run via: pnpm check-types (tsconfig.test-types.json)
 */

import { defineRecipe } from '@schema-engine/forms-radiant';
import { defineRecipeSpec, type ViewModel } from '@schema-engine/forms/recipes';
import { DEFAULT_WIZARD_RECIPE, type FormSubmissionState, type FormValues } from '@schema-engine/forms';
import { FORM_ROOT, type FieldArrayValue, type FormStateIssue } from '@schema-engine/forms/state-container';
import { formatIssuePath } from '@schema-engine/registry';
import type { RecipeMetadata } from '@schema-engine/layout';

type Used = [FormSubmissionState, FormValues, FieldArrayValue, FormStateIssue, ViewModel, RecipeMetadata];

declare const used: Used;

void [defineRecipe, defineRecipeSpec, DEFAULT_WIZARD_RECIPE, FORM_ROOT, formatIssuePath, used];

type RadiantExports = typeof import('@schema-engine/forms-radiant');
type AssertNotExported<Key extends PropertyKey> = Key extends keyof RadiantExports ? false : true;

const absentRadiantExports: [AssertNotExported<'defineRecipeSpec'>, AssertNotExported<'DEFAULT_WIZARD_RECIPE'>] = [
	true,
	true,
];

void absentRadiantExports;
