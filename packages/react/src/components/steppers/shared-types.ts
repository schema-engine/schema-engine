import type React from 'react';

/**
 * Shared stepper navigation interface used by all stepper components
 */
export interface SharedStepperNavigation {
	canGoNext: boolean;
	canGoPrevious: boolean;
	isFirstStep: boolean;
	isLastStep: boolean;
	goToStep: (stepIndex: number) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
}

/**
 * Shared step info interface used by all stepper components
 */
export interface SharedStepInfo {
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
 * Shared stepper component props interface
 */
export interface SharedStepperComponentProps {
	steps: SharedStepInfo[];
	currentStepIndex: number;
	navigation: SharedStepperNavigation;
	config?: Record<string, unknown>;
	form: {
		id: string;
		title?: string;
		description?: string;
		isSubmitting?: boolean;
	};
	children?: React.ReactNode;
}
