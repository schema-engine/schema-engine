import type { FormActionTrigger } from '../actions/triggers';
import type { ActionRuntimeContext } from '@schema-engine/actions';

/**
 * Base action context for the builder pattern.
 *
 * Contains the caller-provided form state, validation state, and metadata.
 * The action executor enriches this base context with `config` and `trigger`
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

/**
 * Runtime action context for the builder pattern.
 * Includes the base form context plus the current action config and trigger.
 */
export type BuilderActionRuntimeContext<TConfig = unknown> = ActionRuntimeContext<
	TConfig,
	BuilderActionBaseContext,
	FormActionTrigger
>;
