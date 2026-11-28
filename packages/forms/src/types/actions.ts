import type { FormFetch } from '@/lib/form-fetch.js';
import type { FormActionTrigger } from '../actions/triggers.js';
import type { ActionRuntimeContext } from '@schema-engine/actions';
import type { FormStateError, FormValidateResult } from '@/state-container/types.js';

/**
 * Base action context for the builder pattern.
 *
 * Contains the caller-provided form state, validation state, and metadata.
 * The action dispatcher enriches this base context with `config` and `trigger`
 * before invoking action handlers.
 */
export interface BuilderActionBaseContext {
	/** Unique form identifier */
	formId: string;
	/** Current form data (all fields) */
	formData: Record<string, unknown>;
	/** The id of the current step. */
	stepId: string;
	/** The 0-based position of the current step among the steps that are not skipped. */
	currentStep: number;
	/** How many steps are not skipped. */
	totalSteps: number;
	/**
	 * Whether no validation error is currently recorded.
	 *
	 * @remarks
	 * It is true on a pristine form even when a required field is empty, until a validation records an error.
	 * Call `form.checkValidity()` to validate the current values.
	 */
	isValid: boolean;
	/** Validation errors by dotted field path; `'__root__'` is the form itself. Warnings are not included. */
	errors: Readonly<Record<string, FormStateError>>;
	/** Form metadata and timing information */
	metadata: {
		/** Timestamp when current step started */
		stepStartTime: number;
		/** Total time spent in form (ms) */
		totalFormTime: number;
		/** Number of user interactions */
		userInteractions: number;
	};
	/**
	 * The engine's request function, with its CSRF policy applied.
	 *
	 * @remarks Use it for every request an action makes: a same-origin unsafe request then carries the token, and nothing else does.
	 */
	fetch: FormFetch;
	/** Form controller methods (framework-agnostic) */
	form: {
		/** Reset form to initial values */
		reset: () => void;
		/** Set field value */
		setValue: (name: string, value: unknown) => void;
		getValue: (name: string) => unknown;
		/**
		 * Validates the whole form, recording and showing its errors, and says how that ended.
		 *
		 * @remarks `'overtaken'` is no verdict: an edit or a reset outran the check, so ask again and do not treat it as invalid.
		 */
		validate: () => Promise<FormValidateResult>;
		/**
		 * Resolves to whether the values current at the call are valid, recording and showing no errors.
		 *
		 * @remarks
		 * Covers every field of every step, unlike a step-scoped `validate`. Fields hidden or disabled, by their config or a constraint, and the fields of a skipped step take no part and are not checked (`resolveParticipation`). Does not cancel a field validation
		 * that is pending, and a later edit does not change the answer. A debounced async rule waits out its delay.
		 */
		checkValidity: () => Promise<boolean>;
	};
}

/**
 * Runtime action context for the builder pattern.
 * Includes the base form context plus the current action config and trigger.
 */
export type BuilderActionRuntimeContext<TConfig = unknown> = ActionRuntimeContext<
	TConfig,
	BuilderActionBaseContext,
	FormActionTrigger
>;
