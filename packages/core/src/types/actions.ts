/**
 * Action triggers for the new builder pattern - events that can trigger action execution.
 *
 * These events define when actions should be executed in the form lifecycle.
 *
 * NOTE: This is the new v2.0 type. The old ActionTrigger from ./actions/triggers is deprecated.
 */
export type BuilderActionTrigger =
	| 'form_start' // When form is initialized
	| 'form_mount' // When form is mounted in the DOM
	| 'form_unmount' // When form is unmounted from the DOM
	| 'step_start' // When a new step begins (multi-step forms)
	| 'step_end' // When a step is completed
	| 'field_change' // When any field value changes
	| 'field_blur' // When any field loses focus
	| 'field_focus' // When any field gains focus
	| 'validation_error' // When validation fails
	| 'validation_success' // When validation succeeds
	| 'form_submit' // When form is submitted
	| 'form_submit_success' // When form submission succeeds
	| 'form_submit_error' // When form submission fails
	| 'manual_reset'; // When form is manually reset

/**
 * Action execution context for the new builder pattern.
 *
 * Contains all information about the form state, validation, and metadata.
 *
 * NOTE: This is the new v2.0 type. The old ActionExecutionContext from ./actions/types is deprecated.
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
	/** Form metadata and timing information */
	metadata: {
		/** Timestamp when current step started */
		stepStartTime: number;
		/** Total time spent in form (ms) */
		totalFormTime: number;
		/** Number of user interactions */
		userInteractions: number;
	};
	/** Form controller methods (framework-specific) */
	form: {
		/** Reset form to initial values */
		reset: () => void;
		/** Set field value */
		setValue: (name: string, value: unknown) => void;
		/** Get field value */
		getValue: (name: string) => unknown;
		/** Trigger validation */
		validate: () => Promise<boolean>;
		[key: string]: unknown;
	};
}

/**
 * Action execution result for the new builder pattern.
 *
 * Provides standardized response format for action execution.
 *
 * NOTE: This is the new v2.0 type. The old ActionExecutionResult from ./actions/types is deprecated.
 */
export interface BuilderActionExecutionResult {
	/** Whether the action executed successfully */
	success: boolean;
	/** Success message to display or log */
	message?: string;
	/** Error message if action failed */
	error?: string;
	/** Data returned by the action (e.g., API response) */
	data?: unknown;
	/** Whether to continue executing subsequent actions */
	shouldContinue?: boolean;
	/** URL to redirect to after action completion */
	redirectUrl?: string;
}
