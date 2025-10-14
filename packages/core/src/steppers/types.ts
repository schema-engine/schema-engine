import { z } from 'zod';

/**
 * Base stepper configuration schema
 * Note: Using `.strict()` to enforce type safety and prevent excess properties
 */
export const BaseStepperConfigSchema = z
	.object({
		__id: z.string().describe('Unique identifier for the stepper type'),
	})
	.strict();

/**
 * Base stepper configuration that will be stored in the form configuration
 */
export interface BaseStepperConfig {
	__id: string;
}

/**
 * Registry of specific stepper configurations
 * This can be extended via module augmentation to add typed configurations for specific steppers
 */
export interface StepperConfigRegistry {}

/**
 * Union type of all stepper configurations
 * This provides type safety while allowing extensions
 */
export type StepperConfig = StepperConfigRegistry[keyof StepperConfigRegistry];

/**
 * Helper type for getting configuration type by stepper ID
 */
export type GetStepperConfig<TId extends keyof StepperConfigRegistry> = StepperConfigRegistry[TId];

/**
 * Module augmentation interface - extend this to add custom stepper types
 *
 * @example
 * ```ts
 * declare module '@json-form-engine/core/steppers/types' {
 *   interface StepperConfigRegistry {
 *     'custom-stepper': CustomStepperConfig;
 *   }
 * }
 * ```
 */
export interface StepperConfigExtensions {}

// Type helpers for better IntelliSense
export type StepperConfigForId<T extends string> = T extends keyof StepperConfigRegistry
	? StepperConfigRegistry[T]
	: BaseStepperConfig & { id: T };

export type Validids = keyof StepperConfigRegistry;

/**
 * Individual step information for stepper components
 */
export interface StepInfo {
	id: string;
	title?: string;
	description?: string;
	index: number;
	total: number;
	isActive: boolean;
	isCompleted: boolean;
	isValid: boolean;
	isVisited: boolean;
}

/**
 * Navigation controls for stepper
 */
export interface StepperNavigationControls {
	canGoNext: boolean;
	canGoPrevious: boolean;
	isFirstStep: boolean;
	isLastStep: boolean;
	goToStep: (stepIndex: number) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
	submitForm: () => void;
}

/**
 * Props passed to stepper components
 */
export interface StepperComponentProps {
	/**
	 * Array of step information
	 */
	steps: StepInfo[];

	/**
	 * Index of the currently active step
	 */
	currentStepIndex: number;

	/**
	 * Navigation controls
	 */
	navigation: StepperNavigationControls;

	/**
	 * Stepper-specific configuration options
	 */
	config: Record<string, any>;

	/**
	 * Form-level context
	 */
	form: {
		id: string;
		title?: string;
		description?: string;
		isSubmitting?: boolean;
	};
}

/**
 * Stepper metadata for registries and tooling.
 *
 * Provides rich information for documentation generation, IDE tooling,
 * form builders, and JSON schema generation.
 */
export interface StepperMetadata {
	/** Human-readable display name */
	name: string;
	/** Detailed description of the stepper's purpose and behavior */
	description: string;
	/** Category for grouping similar steppers (e.g., "horizontal", "vertical", "minimal") */
	category?: string;
	/** Whether this stepper is deprecated and should not be used in new forms */
	deprecated?: boolean;
	/** Example configuration showing typical usage */
	example?: any;
	/** URL to preview image or screenshot */
	preview?: string;
	/** Tags for filtering and searching */
	tags?: string[];
}
