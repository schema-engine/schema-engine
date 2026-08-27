import type React from 'react';
import type { FormConfig, FormStep } from '@schema-engine/forms';
import type { FormStepperConfig } from '@schema-engine/forms/schemas/form-config';
import type { StepData, StepperNavigation } from '../steppers/types';
import { useFormEngine } from '@/hooks';
import { StepperProvider, useStepperContext } from '@/contexts/stepper-context';

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
 * Headless fallback stepper: renders children with minimal prev/next/submit controls.
 * Buttons stay in the DOM and are hidden with CSS to avoid RHF validation triggers.
 */
const HeadlessStepper: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	const { steps, currentStepIndex, navigation, form } = useStepperContext();

	return (
		<div className="flex flex-col gap-6">
			<nav aria-label="Form steps" className="flex flex-wrap gap-2">
				{steps.map((step, index) => (
					<button
						key={step.id}
						type="button"
						onClick={() => navigation.goToStep(index)}
						disabled={!step.isVisited && index > currentStepIndex}
						aria-current={step.isActive ? 'step' : undefined}
						className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
					>
						{step.title ?? `Step ${index + 1}`}
					</button>
				))}
			</nav>

			{children}

			<div className="flex items-center justify-between gap-4">
				<button
					type="button"
					onClick={navigation.goToPreviousStep}
					disabled={navigation.isFirstStep}
					className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
				>
					Previous
				</button>

				<span className="text-sm text-muted-foreground">
					Step {currentStepIndex + 1} of {steps.length}
				</span>

				<div className="flex gap-2">
					<button
						type="submit"
						style={{ display: navigation.isLastStep ? 'inline-flex' : 'none' }}
						className="rounded-md border px-4 py-2 text-sm"
					>
						{form.isSubmitting ? 'Submitting...' : 'Submit'}
					</button>

					<button
						type="button"
						onClick={navigation.goToNextStep}
						disabled={!navigation.canGoNext}
						style={{ display: navigation.isLastStep ? 'none' : 'inline-flex' }}
						className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
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
