import type { ActionSequenceEntry } from '@schema-engine/actions';
import type { FormEngineRuntime } from '@/engine/form-engine';
import type { FormActionConfig, SubmissionActionResult } from '@/engine/submission-lifecycle';
import type { FormStepState, StepNavigationMode } from '@/engine/step-machine';
import type { ValidationStep } from '@/engine/value-validation';
import type { FormFetch } from '@/lib/form-fetch';
import type { FormActionTrigger } from '@/actions';
import type {
	FormStateContainer,
	FormStateContainerConfig,
	FormStateErrorsInput,
	FormStateHydration,
	FormSubmissionIssue,
} from '@/state-container/types';

/** An action as the runtime reads it: the loose shape every typed action of a normalized config extends. */
export type FormRuntimeAction = FormActionConfig;

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
 * - `overtaken`: an edit or a reset outran the check, so there is no verdict: nothing is shown or focused.
 * - `refused`: there was nowhere to go, or the step is unknown, skipped or not reachable.
 * - `busy`: another command was running.
 * - `cancelled`: a reset or an unmount revoked the command, which then wrote nothing.
 */
export type FormRuntimeOutcome =
	'moved' | 'submitted' | 'failed' | 'invalid' | 'overtaken' | 'refused' | 'busy' | 'cancelled';

/** How `next()`, `back()` and `goTo()` ended. */
export type NavigationOutcome = Extract<
	FormRuntimeOutcome,
	'moved' | 'invalid' | 'overtaken' | 'refused' | 'busy' | 'cancelled'
>;

/** How `submit()` ended: before the last active step it acts as `next()`, so it can end `moved`. */
export type SubmitOutcome = Extract<
	FormRuntimeOutcome,
	'moved' | 'submitted' | 'failed' | 'invalid' | 'overtaken' | 'busy' | 'cancelled'
>;

/** Where a submission is: `idle` until one starts, `pending` while it runs, then how it ended. */
export type SubmissionStatus = 'idle' | 'pending' | 'success' | 'error';

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
	readonly steps: {
		/** The id of the current step. */
		readonly current: string;
		/** A `next`, `back`, `goTo` or a submit that acts as `next` is running. */
		readonly navigating: boolean;
		/** Every step in config order, skipped ones included. */
		readonly list: readonly FormStepState[];
	};
}

/** What only the renderer can do. */
export interface FormRuntimeHost {
	/**
	 * Focuses the first control with an error among `paths`.
	 *
	 * @remarks The paths are those of the fields that have an error; the host picks the first in the document.
	 */
	focus(paths: readonly string[]): void;
	/** Writes the controls' values to the container and reports their native validity, as a submit does, before a check. */
	sync?(): void;
	/**
	 * Called once a submission succeeded, after its actions and `onSubmit`, so a host whose form can post natively may do it.
	 *
	 * @remarks The host decides whether it posts: Radiant does when the application gave no `onSubmit`. The navigation cannot cut off the success and complete triggers, which ran first.
	 */
	submitNatively?(): void;
}

/** A step of the config the runtime reads. */
export interface FormRuntimeStep<TAction extends FormActionConfig> extends ValidationStep {
	readonly id: string;
	/** Actions dispatched after the form's on every trigger while this step is current. */
	readonly actions?: readonly ActionSequenceEntry<TAction>[];
}

/** The normalized form config, in the shape the runtime reads. */
export interface FormRuntimeConfig<TAction extends FormActionConfig> extends FormStateContainerConfig {
	readonly id?: string;
	readonly navigation?: StepNavigationMode;
	readonly actions?: readonly ActionSequenceEntry<TAction>[];
	readonly steps: readonly FormRuntimeStep<TAction>[];
}

/** What {@link createFormRuntime} builds a runtime from. */
export interface CreateFormRuntimeOptions<TAction extends FormActionConfig> {
	/** The engine, for its validation registry, its actions and its `fetch`. */
	engine: FormEngineRuntime;
	config: FormRuntimeConfig<TAction>;
	/** Values the form starts from, over the defaults of its fields. */
	defaults?: Record<string, unknown>;
	/** The snapshot of a container that rendered the form on the server, to start from. */
	snapshot?: FormStateHydration;
	host: FormRuntimeHost;
	/** Called with the values that passed validation, after the submit actions and before the success trigger. */
	onSubmit?: (data: FormValues, helpers: FormSubmitHelpers) => void | Promise<void>;
	/** Called when the values change, never for an error, a touch or a validation result. */
	onChange?: (data: FormValues) => void;
	/** Called with each submit action that succeeded. Typed by the engine's actions. */
	onAction?: (action: TAction, data: FormValues) => void | Promise<void>;
	/** Called with the results of every trigger that ran actions, and once with those of the submit actions. */
	onActionResults?: (results: readonly SubmissionActionResult[], trigger: FormActionTrigger) => void | Promise<void>;
}

/** One instance of a form's lifecycle and wizard navigation, shared by every renderer. */
export interface FormRuntime {
	/** The form state: values, field state, validation and the captured submission. */
	readonly container: FormStateContainer;
	/**
	 * Starts the runtime: dispatches `form_mount` the first time, and watches the values for `form_change` and `onChange`.
	 *
	 * @remarks The returned function stops the watch and revokes any command in flight, which ends `'cancelled'`. Mounting again is allowed and dispatches `form_mount` no more.
	 */
	mount(): () => void;
	getSnapshot(): FormRuntimeSnapshot;
	getServerSnapshot(): FormRuntimeSnapshot;
	subscribe(listener: () => void): () => void;
	/** Validates the current step and moves to the next active one. */
	next(): Promise<NavigationOutcome>;
	/** Moves to the previous active step, without validating. */
	back(): Promise<NavigationOutcome>;
	/** Moves to the step `id`: back always, forward as the form's `navigation` allows. */
	goTo(id: string): Promise<NavigationOutcome>;
	/** Acts as `next()` before the last active step; on it, validates every active step, runs the actions and `onSubmit`. */
	submit(): Promise<SubmitOutcome>;
	/** Hides the outcome of the last submission: the status goes back to `idle` and the failures are dropped. */
	clearSubmission(): void;
}
