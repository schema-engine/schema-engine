import type React from 'react';

/**
 * Core stepper navigation interface
 * Defines the essential navigation capabilities every stepper must provide
 */
export interface StepperNavigation {
	canGoNext: boolean;
	canGoPrevious: boolean;
	isFirstStep: boolean;
	isLastStep: boolean;
	goToStep: (stepIndex: number) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
}

/**
 * Core step data interface
 * Defines the fundamental properties of a step in any stepper
 */
export interface StepData {
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
 * Core form context interface
 * Defines the essential form state that steppers need
 */
export interface StepperFormContext {
	id: string;
	title?: string;
	description?: string;
	isSubmitting?: boolean;
}

/**
 * Base stepper component interface
 * The fundamental contract that ALL stepper components must implement
 */
export interface BaseStepperProps {
	steps: StepData[];
	currentStepIndex: number;
	navigation: StepperNavigation;
	form: StepperFormContext;
	children?: React.ReactNode;
	config?: Record<string, unknown>;
}

/**
 * Stepper component type definition
 * The signature that all stepper components must follow
 */
export type StepperComponent<T = Record<string, unknown>> = React.FC<BaseStepperProps & { config?: T }>;
