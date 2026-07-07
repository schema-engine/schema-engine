import type React from 'react';
import type { FormConfig, FormStep } from '@schema-engine/forms';
import type { FormStepperConfig } from '@schema-engine/forms/schemas/form-config';
import type { StepData, StepperNavigation } from '../steppers/types';
import { useFormEngine } from '@/hooks';
import { StepperProvider } from '@/components/steppers/context';
import { DefaultStepperComposed } from '../steppers/default-stepper';

interface StepperRendererProps {
	/**
	 * Form configuration containing stepper information
	 */
	form: FormConfig & { stepper?: FormStepperConfig };

	/**
	 * Array of form steps
	 */
	steps: FormStep[];

	/**
	 * Current step index
	 */
	currentStepIndex: number;

	/**
	 * Step validation states
	 */
	stepStates: {
		completed: boolean[];
		valid: boolean[];
		visited: boolean[];
	};

	/**
	 * Navigation functions
	 */
	navigation: StepperNavigation;

	/**
	 * Form submission state
	 */
	isSubmitting?: boolean;

	/**
	 * Children to render inside the stepper (form content)
	 */
	children?: React.ReactNode;
}

/**
 * Stepper Renderer Component
 *
 * Resolves and renders the appropriate stepper component based on the form configuration.
 * Falls back to the registered default stepper when none is specified or not found.
 */
export const StepperRenderer: React.FC<StepperRendererProps> = ({
	form,
	steps,
	currentStepIndex,
	stepStates,
	navigation,
	isSubmitting = false,
	children,
}) => {
	const { engine } = useFormEngine();

	const stepInfos: StepData[] = steps.map((step: FormStep, index: number) => ({
		id: step.id,
		title: step.title,
		description: step.description,
		index,
		total: steps.length,
		isActive: index === currentStepIndex,
		isCompleted: stepStates.completed[index] || false,
		isValid: stepStates.valid[index] || false,
		isVisited: stepStates.visited[index] || false,
	}));

	const navigationControls: StepperNavigation = {
		canGoNext: navigation.canGoNext,
		canGoPrevious: navigation.canGoPrevious,
		isFirstStep: currentStepIndex === 0,
		isLastStep: currentStepIndex === steps.length - 1,
		goToStep: navigation.goToStep,
		goToNextStep: navigation.goToNextStep,
		goToPreviousStep: navigation.goToPreviousStep,
	};

	const contextValue = {
		steps: stepInfos,
		currentStepIndex,
		navigation: navigationControls,
		form: {
			id: form.id,
			title: form.title,
			description: form.description,
			isSubmitting,
		},
		config: form.stepper || {},
	};

	const renderStepper = (StepperComponent: React.ComponentType<{ children?: React.ReactNode }>) => (
		<StepperProvider value={contextValue}>
			<StepperComponent>{children}</StepperComponent>
		</StepperProvider>
	);

	if (!form.stepper?.$type) {
		return renderStepper(DefaultStepperComposed);
	}

	const { $type, ...stepperConfig } = form.stepper;

	const stepperRegistration = engine.getStepper($type);

	if (!stepperRegistration) {
		console.warn(`Stepper '${$type}' not found in registry. Using default stepper.`);
		return renderStepper(DefaultStepperComposed);
	}

	const StepperComponent = stepperRegistration.render as React.ComponentType<{ children?: React.ReactNode }>;

	return (
		<StepperProvider value={{ ...contextValue, config: stepperConfig }}>
			<StepperComponent>{children}</StepperComponent>
		</StepperProvider>
	);
};

export default StepperRenderer;
