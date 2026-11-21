import type { FormActionTrigger } from '../actions/triggers';
import type { ActionRuntimeContext } from '@schema-engine/actions';

/** The error a field reports, as an action sees it. */
export interface FormFieldError {
	readonly type?: string;
	readonly message?: string;
}

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
	/** Current step index (for multi-step forms) */
	currentStep: number;
	/** Total number of steps */
	totalSteps: number;
	/**
	 * Whether no validation error is currently recorded.
	 *
	 * @remarks
	 * It is true on a pristine form even when a required field is empty, until a validation records an error.
	 * Call `form.checkValidity()` to validate the current values.
	 */
	isValid: boolean;
	/** Validation errors by dotted field path; `''` is the form itself. */
	errors: Readonly<Record<string, FormFieldError>>;
	/** Form metadata and timing information */
	metadata: {
		/** Timestamp when current step started */
		stepStartTime: number;
		/** Total time spent in form (ms) */
		totalFormTime: number;
		/** Number of user interactions */
		userInteractions: number;
	};
	/** Form controller methods (framework-agnostic) */
	form: {
		/** Reset form to initial values */
		reset: () => void;
		/** Set field value */
		setValue: (name: string, value: unknown) => void;
		getValue: (name: string) => unknown;
		/** Validates the whole form, recording and showing its errors, and resolves to its validity. */
		validate: () => Promise<boolean>;
		/**
		 * Resolves to whether the values current at the call are valid, recording and showing no errors.
		 *
		 * @remarks
		 * Covers every field of every step except those a `show` or `hide` constraint hides, unlike a step-scoped `validate`; a submission can still validate a field that was visible before it was hidden. A disabled field is still checked. Does not cancel a field validation
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
