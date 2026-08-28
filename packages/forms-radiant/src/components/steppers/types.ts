import type { JsxRenderable } from '@ecopages/jsx';

export interface StepperNavigation {
	canGoNext: boolean;
	canGoPrevious: boolean;
	isFirstStep: boolean;
	isLastStep: boolean;
	goToStep: (stepIndex: number) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
}

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

export interface StepperFormContext {
	id: string;
	title?: string;
	description?: string;
	isSubmitting?: boolean;
}

export interface BaseStepperProps {
	steps: StepData[];
	currentStepIndex: number;
	navigation: StepperNavigation;
	form: StepperFormContext;
	children?: JsxRenderable;
	config?: Record<string, unknown>;
	className?: string;
}

export type StepperComponent<T = Record<string, unknown>> = (props: BaseStepperProps & { config?: T }) => JsxRenderable;

export interface BaseStepperConfig {
	$type: string;
}
