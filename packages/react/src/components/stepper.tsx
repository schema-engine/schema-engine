import type React from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/shadcn/lib/utils';
import { Button } from '@/shadcn/ui/button';
import type {
	FormStep,
	StepHandlers,
	StepNavigationButton,
	StepNavigationConfig,
	StepperContextData,
	StepperOrientation,
	StepperValidationMode,
	StepperVariant,
} from '@json-form-engine/core/schemas';

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

const StepperContext = createContext<StepperContextData | null>(null);

export function useStepper() {
	const context = useContext(StepperContext);
	if (!context) {
		throw new Error('useStepper must be used within a Stepper component');
	}
	return context;
}

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

	const formData = getFormData?.() || {};
	const canGoNext = currentStep < totalSteps - 1;
	const canGoPrevious = currentStep > 0;

	const validateCurrentStep = useCallback(async (): Promise<boolean> => {
		if (validateStep) {
			return await validateStep(currentStep);
		}

		const step = steps[currentStep];

		if (handlers?.onStepValidate) {
			const result = await handlers.onStepValidate(step.id, currentStep, formData);
			return Boolean(result);
		}

		return true;
	}, [currentStep, validateStep, steps, handlers, formData]);

	const goToStep = useCallback(
		async (step: number) => {
			if (step < 0 || step >= totalSteps) return;

			if (validationMode === 'wizard' && step > currentStep) {
				const isValid = await validateCurrentStep();
				if (!isValid) {
					console.log('Step validation failed, staying on current step');
					return;
				}
			}

			const currentStep_data = steps[currentStep];
			if (handlers?.onStepLeave) {
				const canLeave = await handlers.onStepLeave(currentStep_data.id, currentStep, formData);
				if (!canLeave) return;
			}

			setCurrentStep(step);

			const newStep = steps[step];
			if (handlers?.onStepEnter) {
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

export interface StepperHeaderProps {
	navigation?: StepNavigationConfig;
	className?: string;
}

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

						{index < steps.length - 1 && orientation === 'vertical' && (
							<div
								className={cn(
									'absolute left-6 w-0.5 bg-gray-200',
									'top-16 h-6',
									isCompleted && 'bg-green-500',
								)}
							/>
						)}

						{index < steps.length - 1 && orientation === 'horizontal' && (
							<div className={cn('flex-1 h-0.5 mx-4 bg-gray-200', isCompleted && 'bg-green-500')} />
						)}
					</div>
				);
			})}
		</div>
	);
}

export interface StepperContentProps {
	children: React.ReactNode;
	className?: string;
}

export function StepperContent({ children, className }: StepperContentProps) {
	return <div className={cn('stepper-content', className)}>{children}</div>;
}

export interface StepperNavigationProps {
	navigation?: StepNavigationConfig;
	onSubmit?: () => void;
	className?: string;
}

export function StepperNavigation({ navigation, onSubmit, className }: StepperNavigationProps) {
	const { currentStep, isFirstStep, isLastStep, canGoNext, canGoPrevious, goToNext, goToPrevious, steps, handlers } =
		useStepper();

	const currentStep_data = steps[currentStep];
	const formData = {};

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

			<div>
				<Button
					type="submit"
					variant={getVariantForButton(submitButton.variant)}
					onClick={onSubmit}
					disabled={submitButton.disabled}
					className={cn(submitButton.className, {
						hidden: submitButton.hidden || !isLastStep,
					})}
				>
					{submitButton.label}
				</Button>
				<Button
					type="button"
					variant={getVariantForButton(nextButton.variant)}
					onClick={goToNext}
					disabled={!canGoNext || nextButton.disabled}
					className={cn(nextButton.className, {
						hidden: nextButton.hidden || isLastStep,
					})}
				>
					{nextButton.label}
				</Button>
			</div>
		</div>
	);
}

Stepper.Header = StepperHeader;
Stepper.Content = StepperContent;
Stepper.Navigation = StepperNavigation;
