import type { FormActionTrigger } from '../actions/triggers';

/**
 * Action triggers for the builder pattern - events that can trigger action execution.
 *
 * These events define when actions should be executed in the form lifecycle.
 * This is an alias for ActionTrigger from ./actions/triggers for backward compatibility.
 */
export type BuilderActionTrigger = FormActionTrigger;

/**
 * Action execution context for the builder pattern.
 *
 * Contains all information about the form state, validation, and metadata.
 * This is the context passed to builder action execute functions.
 */
export interface BuilderActionExecutionContext<TConfig = unknown> {
	/** The action configuration */
	config: TConfig;
	/** Unique form identifier */
	formId: string;
	/** Current form data (all fields) */
	formData: Record<string, unknown>;
	/** Current step index (for multi-step forms) */
	currentStep: number;
	/** Total number of steps */
	totalSteps: number;
	/** Whether the form is currently valid */
	isValid: boolean;
	/** Validation errors by field name */
	errors: Record<string, unknown>;
	/** The trigger event that caused this action to execute */
	trigger: FormActionTrigger;
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
		/** Get field value (optional - use getValues if not available) */
		getValue?: (name: string) => unknown;
		/** Trigger validation (optional - use trigger if not available) */
		validate?: () => Promise<boolean>;
		[key: string]: unknown;
	};
}
