import type { ParsedActionSequence } from '@schema-engine/actions';
import type { FormEngineRuntime } from '../engine/form-engine.js';
import type { FormActionConfig, SubmissionActionResult } from './submission-lifecycle.js';
import type { FormStepState, StepNavigationMode } from '../engine/step-machine.js';
import type { ValidationStep } from '../engine/value-validation.js';
import type { SubmissionSchema } from '../engine/submission-schema.js';
import type { FormFetch } from '../lib/form-fetch.js';
import type { FormActionTrigger } from '../actions/index.js';
import type { DefaultValuesOf } from '../builder/form-values.js';
import type { ValuesBrand } from '../lib/normalized-form-config.js';
import type {
	FormStateContainer,
	FormStateContainerConfig,
	FormStateErrorsInput,
	FormIssueFormatter,
	FormStateHydration,
	FormSubmissionIssue,
} from '../state-container/types.js';

/** The nested values of a form, as the container holds them and a submission hands them over. */
export type FormValues = Readonly<Record<string, unknown>>;

/** What `onSubmit` is given besides the values that passed. */
export interface FormSubmitHelpers {
	/** Shows the server's answer to this submission, by path; `FORM_ROOT` stands for the form. */
	setServerErrors: (errors: FormStateErrorsInput) => void;
	/**
	 * The engine's `fetch`: the request to send the values with.
	 *
	 * @remarks It applies the engine's CSRF policy to a same-origin unsafe request, so a submit callback adds no token itself.
	 */
	fetch: FormFetch;
}

/**
 * How a command ended.
 *
 * @remarks
 * - `moved`: the current step changed.
 * - `submitted` and `failed`: a submission ran and its actions and `onSubmit` succeeded or did not. Why it
 *   failed is in `snapshot.submission.failures`, never in the return value.
 * - `invalid`: validation found errors, which are shown and focused.
 * - `overtaken`: an edit or a row move outran the check, so there is no verdict: nothing is shown or focused.
 * - `refused`: there was nowhere to go, or the step is unknown, skipped or not reachable.
 * - `busy`: another command was running.
 * - `cancelled`: a reset or an unmount revoked the command, which then wrote nothing.
 */
export type FormRuntimeOutcome =
	'moved' | 'submitted' | 'failed' | 'invalid' | 'overtaken' | 'refused' | 'busy' | 'cancelled';

/** How `next()`, `back()` and `goTo()` ended. */
export type NavigationOutcome = Extract<
	FormRuntimeOutcome,
	'moved' | 'failed' | 'invalid' | 'overtaken' | 'refused' | 'busy' | 'cancelled'
>;

/** How `submit()` ended: before the last active step it acts as `next()`, so it can end `moved`. */
export type SubmitOutcome = Extract<
	FormRuntimeOutcome,
	'moved' | 'submitted' | 'failed' | 'invalid' | 'overtaken' | 'refused' | 'busy' | 'cancelled'
>;

/**
 * Where a submission is: `idle` until one starts, `validating` while its validation runs, `submitting` once it passed and the actions and `onSubmit` run, then how it ended.
 *
 * @remarks A submission that is `invalid` or `overtaken` goes from `validating` back to `idle` and is never `submitting`: submission starts, for the `form_submit_start` trigger and for a renderer's own start event, once it passed validation.
 */
export type SubmissionStatus = 'idle' | 'validating' | 'submitting' | 'success' | 'error';

/**
 * Whether a submission is in progress: its validation or its actions are running.
 *
 * @remarks The one definition of busy, which the runtime's revoke and every renderer's submit button, label and busy state share.
 */
export function isSubmissionBusy(status: SubmissionStatus): boolean {
	return status === 'validating' || status === 'submitting';
}

/**
 * What the form reports about its submissions.
 *
 * @remarks `failures` explain an `error` status and are empty otherwise. They are issues, so the form's one formatter words them.
 */
export interface FormSubmissionState {
	readonly status: SubmissionStatus;
	readonly failures: readonly FormSubmissionIssue[];
	/** The submissions that ended, whether they passed or failed validation, since the form was created or reset. */
	readonly submitCount: number;
}

/** What a runtime reports: its submission, and its steps. */
export interface FormRuntimeSnapshot {
	readonly submission: FormSubmissionState;
	/** The id of the current step. */
	readonly current: string;
	/** A `next`, `back`, `goTo` or a submit that acts as `next` is running. */
	readonly navigating: boolean;
	/** Every step in config order, skipped ones included. */
	readonly steps: readonly FormStepState[];
}

/**
 * What an application reads of a form's wizard: where it is, and the commands that move it.
 *
 * @remarks
 * The commands are those of the form's runtime and end with an outcome (`'moved'`, `'invalid'`, `'busy'`, ...). `steps` lists every
 * step in order with its `title`, `skipped`, `visited`, `complete` and `invalid`; a skipped step is passed over by `next` and `back` and refused by `goTo`.
 * Each renderer exposes it its own way: `useFormWizard` in React, `FormController.wizard` in Radiant.
 */
export type FormWizard = Pick<FormRuntimeSnapshot, 'current' | 'steps' | 'navigating'> &
	Pick<FormRuntime, 'next' | 'back' | 'goTo'>;

/** What only the renderer can do. */
export interface FormRuntimeHost {
	/**
	 * Focuses the first control with an error among `paths`.
	 *
	 * @remarks The paths are those of the fields that have an error; the host picks the first in the document. The list may be empty (a rule that could not run records no field error), and the host then focuses nothing.
	 */
	focus(paths: readonly string[]): void;
	/** Writes the controls' values to the container and reports their native validity, as a submit does, before a check. */
	sync?(): void;
	/**
	 * Called once a submission succeeded, after its actions and `onSubmit`, with the values the form declares, so a host whose form can post natively may do it with them.
	 *
	 * @remarks The values are what the form's elements write, checked by the schema derived from them, and not what the application's schema made of them (a `Date`, a class): a form posts what its fields hold. The host decides whether it posts, because a renderer always passes a stable `onSubmit` wrapper and the runtime cannot tell whether the application gave one: Radiant posts when it did not. The navigation cannot cut off the success and complete triggers, which ran first.
	 */
	submitNatively?(values: FormValues): void;
}

/** A step of the config the runtime reads. */
export interface FormRuntimeStep<TAction extends FormActionConfig = FormActionConfig> extends ValidationStep {
	readonly id: string;
	/** Carried to the step's {@link FormStepState.title}. */
	readonly title?: string;
	/** Actions dispatched after the form's on every trigger while this step is current. */
	readonly actions?: ParsedActionSequence<TAction>;
}

/** The normalized form config, in the shape the runtime reads. */
export interface FormRuntimeConfig<
	TAction extends FormActionConfig = FormActionConfig,
> extends FormStateContainerConfig {
	readonly id?: string;
	readonly navigation?: StepNavigationMode;
	readonly actions?: ParsedActionSequence<TAction>;
	readonly steps: readonly FormRuntimeStep<TAction>[];
}

/**
 * What {@link createFormRuntime} builds a runtime from.
 *
 * @template TValues - The values a submission holds, which the form's config carries ({@link ValuesBrand}); {@link FormValues} when it is not typed. It is inferred from `config`, which the runtime has parsed every submission against before it reaches a callback.
 */
export interface CreateFormRuntimeOptions<TAction extends FormActionConfig = FormActionConfig, TValues = FormValues> {
	/** The engine, for its validation registry, its actions and its `fetch`. */
	engine: FormEngineRuntime;
	config: FormRuntimeConfig<TAction> & ValuesBrand<TValues>;
	/** Values the form starts from, over the defaults of its fields. */
	defaults?: DefaultValuesOf<TValues>;
	/** The snapshot of a container that rendered the form on the server, to start from. */
	snapshot?: FormStateHydration;
	host: FormRuntimeHost;
	/** Called with the values that passed validation and matched the form's value schemas, after the submit actions and before the success trigger. */
	onSubmit?: (data: TValues, helpers: FormSubmitHelpers) => void | Promise<void>;
	/** Called when the values change, never for an error, a touch or a validation result. */
	onChange?: (data: FormValues) => void;
	/** Called with each submit action that succeeded, and the values that passed. Typed by the engine's actions. */
	onAction?: (action: TAction, data: TValues) => void | Promise<void>;
	/**
	 * Takes the page to the `redirectUrl` a submit action asked for, once the whole submission succeeded.
	 *
	 * @remarks
	 * Called at most once, after every submit action and `onSubmit` succeeded and the success trigger ran, with the
	 * `redirectUrl` of the last successful submit action that set one. It replaces
	 * {@link FormRuntimeHost.submitNatively} for that submission, since a native post would load a page of its own.
	 * Defaults to {@link defaultNavigate}: `location.assign` where `globalThis.location` exists, and nothing on a server.
	 */
	navigate?: (url: string) => void;
	/** Called with the results of every trigger that ran actions, and once with those of the submit actions. */
	onActionResults?: (results: readonly SubmissionActionResult[], trigger: FormActionTrigger) => void | Promise<void>;
}

/** One instance of a form's lifecycle and wizard navigation, shared by every renderer. */
export interface FormRuntime {
	/** The form state: values, field state, validation and the captured submission. */
	readonly container: FormStateContainer;
	/** The normalized config the runtime was created from. */
	readonly config: FormRuntimeConfig;
	/**
	 * The submitted values of the form as a Standard Schema, composed once from the config's elements.
	 *
	 * @remarks The schema every submission is checked against, so a tool that builds values for the form reads it from here and cannot drift from the runtime's.
	 */
	readonly submissionSchema: SubmissionSchema;
	/** The engine's `formatIssue`, which a form without one of its own words its issues with. */
	readonly formatIssue: FormIssueFormatter | undefined;
	/**
	 * Starts the runtime: dispatches `form_mount` the first time, and watches the values for `form_change` and `onChange`.
	 *
	 * @remarks The returned function stops the watch and revokes any command in flight (`next`, `back`, `goTo`, `submit`), which ends `'cancelled'`. Mounting again is allowed and dispatches `form_mount` no more.
	 */
	mount: () => () => void;
	getSnapshot: () => FormRuntimeSnapshot;
	getServerSnapshot: () => FormRuntimeSnapshot;
	subscribe: (listener: () => void) => () => void;
	/** Validates the current step and moves to the next active one. */
	next: () => Promise<NavigationOutcome>;
	/** Moves to the previous active step, without validating. */
	back: () => Promise<NavigationOutcome>;
	/** Moves to the step `id`: back always, forward as the form's `navigation` allows. */
	goTo: (id: string) => Promise<NavigationOutcome>;
	/** Acts as `next()` before the last active step; on it, validates every active step, runs the actions and `onSubmit`. */
	submit: () => Promise<SubmitOutcome>;
	/** Hides the outcome of the last submission: the status goes back to `idle` and the failures are dropped. */
	clearSubmission: () => void;
}
