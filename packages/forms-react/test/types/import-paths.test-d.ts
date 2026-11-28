/**
 * Compile-time checks of the symbols that moved to their owner in the one-import-path change, for the entry of
 * this package that lost them: `@schema-engine/forms-react/hooks`. The removed `/contexts` entry is checked in `test/consumer`, which resolves the way an app does. The old
 * paths of the other packages are checked in the `test/types/import-paths.test-d.ts` of `@schema-engine/forms-radiant`.
 *
 * Each moved name is imported at its owner, and each old path is read with `@ts-expect-error`, which fails when the
 * old path still exports the name. A type has no key in `typeof import(...)`, so only a member access checks one.
 * Run via: pnpm check-types (tsconfig.test-types.json)
 */

import type { FormSubmissionState, FormSubmitHelpers, FormValues, SubmissionStatus } from '@schema-engine/forms';
import type { ViewModel, ViewNavigation, ViewStep } from '@schema-engine/forms/recipes';
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

export const owners = [FORM_ROOT];

type Hooks = typeof import('@schema-engine/forms-react/hooks');

// @ts-expect-error `FORM_ROOT` is exported by `@schema-engine/forms/state-container` alone.
export type HooksFormRoot = Hooks['FORM_ROOT'];
// @ts-expect-error `FieldArrayValue` is exported by `@schema-engine/forms/state-container` alone.
export type HooksFieldArrayValue = import('@schema-engine/forms-react/hooks').FieldArrayValue;
// @ts-expect-error `FormIssueFormatter` is exported by `@schema-engine/forms/state-container` alone.
export type HooksFormIssueFormatter = import('@schema-engine/forms-react/hooks').FormIssueFormatter;
// @ts-expect-error `FormStateError` is exported by `@schema-engine/forms/state-container` alone.
export type HooksFormStateError = import('@schema-engine/forms-react/hooks').FormStateError;
// @ts-expect-error `FormStateErrorsInput` is exported by `@schema-engine/forms/state-container` alone.
export type HooksFormStateErrorsInput = import('@schema-engine/forms-react/hooks').FormStateErrorsInput;
// @ts-expect-error `FormStateIssue` is exported by `@schema-engine/forms/state-container` alone.
export type HooksFormStateIssue = import('@schema-engine/forms-react/hooks').FormStateIssue;
// @ts-expect-error `FormSubmissionIssue` is exported by `@schema-engine/forms/state-container` alone.
export type HooksFormSubmissionIssue = import('@schema-engine/forms-react/hooks').FormSubmissionIssue;
// @ts-expect-error `FormValues` is exported by `@schema-engine/forms` alone.
export type HooksFormValues = import('@schema-engine/forms-react/hooks').FormValues;
// @ts-expect-error `FormSubmitHelpers` is exported by `@schema-engine/forms` alone.
export type HooksFormSubmitHelpers = import('@schema-engine/forms-react/hooks').FormSubmitHelpers;
// @ts-expect-error `SubmissionStatus` is exported by `@schema-engine/forms` alone.
export type HooksSubmissionStatus = import('@schema-engine/forms-react/hooks').SubmissionStatus;
// @ts-expect-error `SubmissionState` was `FormSubmissionState` of `@schema-engine/forms` under another name.
export type HooksSubmissionState = import('@schema-engine/forms-react/hooks').SubmissionState;
