import type React from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type {
	StepperContextData,
	FormStep,
	StepNavigationConfig,
	StepNavigationButton,
	StepHandlers,
	StepperVariant,
	StepperOrientation,
	StepperValidationMode,
} from './types/form';

/**
 * Helper function to convert button variant to Button component variant
 */
const getVariantForButton = (variant?: string): 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' => {
	switch (variant) {
		case 'primary':
			return 'default';
		case 'secondary':
			return 'secondary';
		case 'outline':
			return 'outline';
		case 'ghost':
			return 'ghost';
		case 'destructive':
			return 'destructive';
		default:
			return 'default';
	}
};

/**
 * Stepper context for managing step state and navigation
 */
const StepperContext = createContext<StepperContextData | null>(null);

/**
 * Hook to access stepper context
 */
export function useStepper() {
	const context = useContext(StepperContext);
	if (!context) {
		throw new Error('useStepper must be used within a Stepper component');
	}
	return context;
}

/**
 * Props for the main Stepper component
 */
export interface StepperProps {
	children: React.ReactNode;
	steps: FormStep[];
	navigation?: StepNavigationConfig;
	handlers?: StepHandlers;
	initialStep?: number;
	variant?: StepperVariant;
	orientation?: StepperOrientation;
	validationMode?: StepperValidationMode;
	onStepChange?: (stepIndex: number, step: FormStep) => void;
	getFormData?: () => any;
	validateStep?: (stepIndex: number) => boolean | Promise<boolean>;
	className?: string;
}

/**
 * Main Stepper component providing step management context
 */
export function Stepper({
	children,
	steps,
	handlers,
	initialStep = 0,
	validationMode = 'wizard',
	onStepChange,
	getFormData,
	validateStep,
	className,
}: StepperProps) {
	const [currentStep, setCurrentStep] = useState(initialStep);

	const totalSteps = steps.length;
	const isFirstStep = currentStep === 0;
	const isLastStep = currentStep === totalSteps - 1;

	// Check if navigation is allowed based on constraints
	const formData = getFormData?.() || {};
	const canGoNext = currentStep < totalSteps - 1;
	const canGoPrevious = currentStep > 0;

	const validateCurrentStep = useCallback(async (): Promise<boolean> => {
		if (validateStep) {
			return await validateStep(currentStep);
		}

		// Call custom step validation handler if defined
		const step = steps[currentStep];
		if (step.onStepValidate && handlers?.customNavigationHandlers?.[step.onStepValidate]) {
			const result = await handlers.customNavigationHandlers[step.onStepValidate](step.id, currentStep, formData);
			return Boolean(result);
		}

		return true;
	}, [currentStep, validateStep, steps, handlers, formData]);

	const goToStep = useCallback(
		async (step: number) => {
			if (step < 0 || step >= totalSteps) return;

			// In wizard mode, validate current step before moving forward
			// In free mode, allow jumping without validation
			if (validationMode === 'wizard' && step > currentStep) {
				const isValid = await validateCurrentStep();
				if (!isValid) {
					console.log('Step validation failed, staying on current step');
					return;
				}
			}

			// Call step leave handler
			const currentStep_data = steps[currentStep];
			if (currentStep_data.onStepLeave && handlers?.onStepLeave) {
				const canLeave = await handlers.onStepLeave(currentStep_data.id, currentStep, formData);
				if (!canLeave) return;
			}

			setCurrentStep(step);

			// Call step enter handler
			const newStep = steps[step];
			if (newStep.onStepEnter && handlers?.onStepEnter) {
				await handlers.onStepEnter(newStep.id, step, formData);
			}

			onStepChange?.(step, newStep);
		},
		[currentStep, totalSteps, validationMode, validateCurrentStep, steps, handlers, formData, onStepChange],
	);

	const goToNext = useCallback(() => {
		if (canGoNext) {
			goToStep(currentStep + 1);
		}
	}, [canGoNext, currentStep, goToStep]);

	const goToPrevious = useCallback(() => {
		if (canGoPrevious) {
			goToStep(currentStep - 1);
		}
	}, [canGoPrevious, currentStep, goToStep]);

	const getStepData = useCallback(
		(stepIndex?: number) => {
			const targetStep = stepIndex ?? currentStep;
			const step = steps[targetStep];
			return {
				step,
				index: targetStep,
				isActive: targetStep === currentStep,
				isCompleted: targetStep < currentStep,
				isUpcoming: targetStep > currentStep,
			};
		},
		[currentStep, steps],
	);

	const contextValue: StepperContextData = {
		currentStep,
		totalSteps,
		steps,
		isFirstStep,
		isLastStep,
		canGoNext,
		canGoPrevious,
		goToStep,
		goToNext,
		goToPrevious,
		validateCurrentStep,
		getStepData,
		handlers,
		validationMode,
	};

	return (
		<StepperContext.Provider value={contextValue}>
			<div className={cn('stepper', className)}>{children}</div>
		</StepperContext.Provider>
	);
}

/**
 * Props for StepperHeader component
 */
export interface StepperHeaderProps {
	navigation?: StepNavigationConfig;
	className?: string;
}

/**
 * Stepper header component displaying step indicators
 */
export function StepperHeader({ navigation, className }: StepperHeaderProps) {
	const { steps, goToStep, getStepData, validationMode, currentStep } = useStepper();

	const orientation = navigation?.orientation || 'horizontal';
	const variant = navigation?.variant || 'default';
	const showNumbers = navigation?.showStepNumbers !== false;
	const showTitles = navigation?.showStepTitles !== false;
	const allowJumping = navigation?.allowStepJumping || false;

	const containerClass = cn(
		'stepper-header',
		orientation === 'horizontal' ? 'flex items-center justify-center' : 'flex flex-col',
		orientation === 'horizontal' ? 'space-x-4' : 'space-y-2',
		className,
	);

	const stepClass = cn(
		'stepper-step flex items-start transition-all duration-200',
		orientation === 'horizontal' ? 'flex-row' : 'flex-row w-full p-3 rounded-lg hover:bg-gray-50',
		allowJumping && 'cursor-pointer hover:opacity-80',
		orientation === 'vertical' && 'w-full',
	);

	return (
		<div className={containerClass}>
			{steps.map((step, index) => {
				const stepData = getStepData(index);
				const isActive = stepData.isActive;
				const isCompleted = stepData.isCompleted;

				// In wizard mode, only allow clicking on completed steps or current step
				// In free mode, allow clicking on any step if jumping is enabled
				const canClickStep =
					allowJumping && (validationMode === 'free' || isCompleted || isActive || index < currentStep);

				const dynamicStepClass = cn(
					stepClass,
					orientation === 'vertical' && 'relative',
					orientation === 'vertical' && isActive && 'bg-blue-50 border-l-4 border-blue-500',
					orientation === 'vertical' && isCompleted && !isActive && 'bg-green-50',
				);

				return (
					<div
						key={step.id}
						className={dynamicStepClass}
						onClick={canClickStep ? () => goToStep(index) : undefined}
						onKeyDown={
							canClickStep
								? (e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											goToStep(index);
										}
									}
								: undefined
						}
						role={canClickStep ? 'button' : undefined}
						tabIndex={canClickStep ? 0 : undefined}
					>
						{/* Step Indicator */}
						<div
							className={cn(
								'step-indicator flex items-center justify-center',
								'w-8 h-8 rounded-full border-2 transition-all',
								isCompleted && 'bg-green-500 border-green-500 text-white',
								isActive && !isCompleted && 'border-blue-500 bg-blue-500 text-white',
								!isActive && !isCompleted && 'border-gray-300 bg-gray-100 text-gray-500',
								variant === 'pills' && 'rounded-full',
								variant === 'dots' && 'w-3 h-3',
							)}
						>
							{variant !== 'dots' && isCompleted ? (
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
									<title>Completed</title>
									<path
										fillRule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clipRule="evenodd"
									/>
								</svg>
							) : showNumbers ? (
								<span className="text-sm font-medium">{index + 1}</span>
							) : (
								step.icon && <span className="text-sm">{step.icon}</span>
							)}
						</div>

						{/* Step Title */}
						{showTitles && variant !== 'dots' && (
							<div
								className={cn(
									'step-title',
									orientation === 'horizontal' ? 'ml-3' : 'mt-2 text-left w-full',
								)}
							>
								<span
									className={cn(
										'text-sm font-medium block',
										isActive ? 'text-blue-600' : 'text-gray-500',
									)}
								>
									{step.title}
								</span>
								{step.description && orientation === 'vertical' && (
									<p className="text-xs text-gray-400 mt-1">{step.description}</p>
								)}
							</div>
						)}

						{/* Connector Line */}
						{index < steps.length - 1 && orientation === 'vertical' && (
							<div
								className={cn(
									'absolute left-6 w-0.5 bg-gray-200',
									'top-16 h-6',
									isCompleted && 'bg-green-500',
								)}
							/>
						)}

						{/* Horizontal Connector */}
						{index < steps.length - 1 && orientation === 'horizontal' && (
							<div className={cn('flex-1 h-0.5 mx-4 bg-gray-200', isCompleted && 'bg-green-500')} />
						)}
					</div>
				);
			})}
		</div>
	);
}

/**
 * Props for StepperContent component
 */
export interface StepperContentProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * Stepper content component for displaying current step content
 */
export function StepperContent({ children, className }: StepperContentProps) {
	return <div className={cn('stepper-content', className)}>{children}</div>;
}

/**
 * Props for StepperNavigation component
 */
export interface StepperNavigationProps {
	navigation?: StepNavigationConfig;
	onSubmit?: () => void;
	className?: string;
}

/**
 * Stepper navigation component with customizable buttons
 */
export function StepperNavigation({ navigation, onSubmit, className }: StepperNavigationProps) {
	const { currentStep, isFirstStep, isLastStep, canGoNext, canGoPrevious, goToNext, goToPrevious, steps, handlers } =
		useStepper();

	const currentStep_data = steps[currentStep];
	const formData = {}; // This should be passed from form context

	// Get button configurations with defaults
	const buttons = navigation?.buttons || {};
	const previousButton: StepNavigationButton = {
		label: 'Previous',
		variant: 'outline',
		...buttons.previous,
	};
	const nextButton: StepNavigationButton = {
		label: 'Next',
		variant: 'primary',
		...buttons.next,
	};
	const submitButton: StepNavigationButton = {
		label: 'Submit',
		variant: 'primary',
		...buttons.submit,
	};

	// Handle custom button actions
	const handleCustomAction = useCallback(
		async (buttonKey: string) => {
			const customButton = buttons.custom?.[buttonKey];
			if (customButton?.customHandler && handlers?.customNavigationHandlers?.[customButton.customHandler]) {
				await handlers.customNavigationHandlers[customButton.customHandler](
					currentStep_data.id,
					currentStep,
					formData,
				);
			}
		},
		[buttons.custom, handlers, currentStep_data.id, currentStep],
	);

	return (
		<div className={cn('stepper-navigation flex justify-between items-center pt-6', className)}>
			{/* Previous Button */}
			<div>
				{!isFirstStep && !previousButton.hidden && (
					<Button
						type="button"
						variant={getVariantForButton(previousButton.variant)}
						onClick={goToPrevious}
						disabled={!canGoPrevious || previousButton.disabled}
						className={previousButton.className}
					>
						{previousButton.label}
					</Button>
				)}
			</div>

			{/* Custom Buttons */}
			<div className="flex space-x-2">
				{buttons.custom &&
					Object.entries(buttons.custom).map(([key, button]) => {
						if (button.hidden) return null;

						return (
							<Button
								key={key}
								type="button"
								variant={getVariantForButton(button.variant)}
								onClick={() => handleCustomAction(key)}
								disabled={button.disabled}
								className={button.className}
							>
								{button.label}
							</Button>
						);
					})}
			</div>

			{/* Next/Submit Button */}
			<div>
				{isLastStep
					? !submitButton.hidden && (
							<Button
								type="submit"
								variant={getVariantForButton(submitButton.variant)}
								onClick={onSubmit}
								disabled={submitButton.disabled}
								className={submitButton.className}
							>
								{submitButton.label}
							</Button>
						)
					: !nextButton.hidden && (
							<Button
								type="button"
								variant={getVariantForButton(nextButton.variant)}
								onClick={goToNext}
								disabled={!canGoNext || nextButton.disabled}
								className={nextButton.className}
							>
								{nextButton.label}
							</Button>
						)}
			</div>
		</div>
	);
}

/**
 * Compound component exports
 */
Stepper.Header = StepperHeader;
Stepper.Content = StepperContent;
Stepper.Navigation = StepperNavigation;
