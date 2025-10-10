import type React from 'react';
import type { FormConfig, FormStep } from '@json-form-engine/core';
import type { FormStepperConfig } from '@json-form-engine/core/schemas/form-config';
import type { StepData, StepperNavigation } from '../steppers/types';
import { useFormEngine } from '@/hooks';
import { StepperProvider, useStepperContext } from '@/contexts/stepper-context';

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
 * Default stepper component that renders a simple step navigation
 */
const DefaultStepper: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	const { steps, navigation } = useStepperContext();

	return (
		<div className="flex flex-col gap-4">
			<div className="flex gap-2">
				{steps.map((step, index: number) => (
					<button
						key={step.id}
						className={`px-4 py-2 rounded-md font-medium transition-colors ${
							step.isActive
								? 'bg-blue-600 text-white'
								: step.isCompleted
									? 'bg-green-600 text-white'
									: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						}`}
						onClick={() => navigation.goToStep(index)}
						type="button"
					>
						<span className="step-number">{index + 1}</span>
						{step.title && <span className="ml-2">{step.title}</span>}
					</button>
				))}
			</div>

			{children}

			<div className="flex gap-2 justify-end">
				{!navigation.isFirstStep && (
					<button
						type="button"
						onClick={navigation.goToPreviousStep}
						disabled={!navigation.canGoPrevious}
						className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
					>
						Previous
					</button>
				)}

				{!navigation.isLastStep ? (
					<button
						type="button"
						onClick={navigation.goToNextStep}
						disabled={!navigation.canGoNext}
						className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
					>
						Next
					</button>
				) : (
					<button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
						Submit
					</button>
				)}
			</div>
		</div>
	);
};

/**
 * Stepper Renderer Component
 *
 * Resolves and renders the appropriate stepper component based on the form configuration.
 * Falls back to a default stepper if none is specified or if the stepper is not found.
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

	if (!form.stepper?.stepperId) {
		return (
			<StepperProvider value={contextValue}>
				<DefaultStepper>{children}</DefaultStepper>
			</StepperProvider>
		);
	}

	const { stepperId, ...stepperConfig } = form.stepper;

	const stepperRegistration = engine.getStepper(stepperId);

	if (!stepperRegistration) {
		console.warn(`Stepper '${stepperId}' not found in registry. Using default stepper.`);
		return (
			<StepperProvider value={{ ...contextValue, config: stepperConfig }}>
				<DefaultStepper>{children}</DefaultStepper>
			</StepperProvider>
		);
	}

	const StepperComponent = stepperRegistration.render as React.ComponentType<{ children?: React.ReactNode }>;

	return (
		<StepperProvider value={{ ...contextValue, config: stepperConfig }}>
			<StepperComponent>{children}</StepperComponent>
		</StepperProvider>
	);
};

export default StepperRenderer;
