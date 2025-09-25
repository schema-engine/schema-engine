/**
 * Base stepper configuration that will be stored in the form configuration
 */
export interface BaseStepperConfig {
	__stepperId: string;
}

/**
 * Registry of specific stepper configurations
 * This can be extended via module augmentation to add typed configurations for specific steppers
 */
export interface StepperConfigRegistry {
	// Add default steppers here
	'progress-bar': ProgressBarStepperConfig;
	vertical: VerticalStepperConfig;
	minimalist: MinimalistStepperConfig;
}

/**
 * Configuration for progress bar stepper
 */
export interface ProgressBarStepperConfig extends BaseStepperConfig {
	__stepperId: 'progress-bar';
	showLabels?: boolean;
	variant?: 'default' | 'compact' | 'minimal';
	showProgress?: boolean;
	animate?: boolean;
}

/**
 * Configuration for vertical stepper
 */
export interface VerticalStepperConfig extends BaseStepperConfig {
	__stepperId: 'vertical';
	showLabels?: boolean;
	showDescription?: boolean;
	variant?: 'default' | 'compact';
	position?: 'left' | 'right';
	width?: string;
}

/**
 * Configuration for minimalist stepper
 */
export interface MinimalistStepperConfig extends BaseStepperConfig {
	__stepperId: 'minimalist';
	showLabels?: boolean;
	variant?: 'dots' | 'lines' | 'numbers';
	allowStepJumping?: boolean;
	size?: 'small' | 'medium' | 'large';
}

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
	: BaseStepperConfig & { __stepperId: T };

export type ValidStepperIds = keyof StepperConfigRegistry;

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
 * Stepper registration definition
 */
export interface StepperRegistration<TComponent = any> {
	/**
	 * Unique identifier for the stepper
	 */
	stepperId: string;

	/**
	 * Display name for the stepper
	 */
	name: string;

	/**
	 * Description of what this stepper does
	 */
	description?: string;

	/**
	 * The stepper component
	 */
	component: TComponent;

	/**
	 * Default configuration for this stepper
	 */
	defaultConfig?: Record<string, any>;

	/**
	 * Schema for validating stepper-specific options
	 */
	optionsSchema?: any; // Can be Zod schema or similar
}

/**
 * Stepper component type definition
 */
export type StepperComponent = React.ComponentType<StepperComponentProps>;
