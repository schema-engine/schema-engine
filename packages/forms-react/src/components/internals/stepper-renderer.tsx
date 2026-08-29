import type React from 'react';
import type { FormConfig, FormStep } from '@schema-engine/forms';
import type { FormStepperConfig } from '@schema-engine/forms/schemas/form-config';
import type { StepData, StepperNavigation } from '../steppers/types';
import { useFormEngine } from '@/hooks';
import { StepperProvider, useStepperContext } from '@/contexts/stepper-context';
import './stepper-renderer.css';

interface StepperRendererProps {
	form: Omit<FormConfig, 'stepper'> & { stepper?: FormStepperConfig };
	steps: FormStep[];
	currentStepIndex: number;
	stepStates: {
		completed: boolean[];
		valid: boolean[];
		visited: boolean[];
	};
	navigation: StepperNavigation;
	isSubmitting?: boolean;
	children?: React.ReactNode;
}

/**
 * Internal fallback when `form.stepper.$type` is missing. Not the registered
 * minimalist stepper: no progress, no step title, no counter. Prev/next stay
 * in the DOM so wizard navigation still works.
 */
const HeadlessStepper: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	const { navigation, form } = useStepperContext();

	return (
		<div className="se-headless-stepper">
			<div className="se-headless-stepper__content">{children}</div>

			<div className="se-headless-stepper__controls">
				<button
					type="button"
					onClick={navigation.goToPreviousStep}
					disabled={navigation.isFirstStep}
					className="se-headless-stepper__button"
				>
					Previous
				</button>

				<div className="se-headless-stepper__actions">
					<button
						type="submit"
						style={{ display: navigation.isLastStep ? 'inline-flex' : 'none' }}
						className="se-headless-stepper__button"
					>
						{form.isSubmitting ? 'Submitting...' : 'Submit'}
					</button>

					<button
						type="button"
						onClick={navigation.goToNextStep}
						disabled={!navigation.canGoNext}
						style={{ display: navigation.isLastStep ? 'none' : 'inline-flex' }}
						className="se-headless-stepper__button"
					>
						Next
					</button>
				</div>
			</div>
		</div>
	);
};

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

	if (!form.stepper?.$type) {
		return (
			<StepperProvider value={contextValue}>
				<HeadlessStepper>{children}</HeadlessStepper>
			</StepperProvider>
		);
	}

	const { $type, ...stepperConfig } = form.stepper;
	const stepperRegistration = engine.getStepper($type);

	if (!stepperRegistration) {
		console.warn(`Stepper '${$type}' not found in registry. Using headless fallback.`);
		return (
			<StepperProvider value={{ ...contextValue, config: stepperConfig }}>
				<HeadlessStepper>{children}</HeadlessStepper>
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
