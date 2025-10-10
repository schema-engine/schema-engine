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

	const isHorizontal = orientation === 'horizontal';
	const isVertical = orientation === 'vertical';

	return (
		<div
			className={cn(
				'stepper__header',
				isHorizontal && 'stepper__header--horizontal',
				isVertical && 'stepper__header--vertical',
				className,
			)}
		>
			{steps.map((step, index) => {
				const { isActive, isCompleted } = getStepData(index);
				const canClick =
					allowJumping && (validationMode === 'free' || isCompleted || isActive || index < currentStep);

				return (
					<div
						key={step.id}
						className={cn(
							'stepper__step',
							isHorizontal && 'stepper__step--horizontal',
							isVertical && 'stepper__step--vertical',
							isVertical && isActive && 'stepper__step--active',
							isVertical && isCompleted && !isActive && 'stepper__step--completed',
							canClick && 'stepper__step--clickable',
						)}
						onClick={canClick ? () => goToStep(index) : undefined}
						onKeyDown={
							canClick
								? (e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											goToStep(index);
										}
									}
								: undefined
						}
						role={canClick ? 'button' : undefined}
						tabIndex={canClick ? 0 : undefined}
					>
						<div
							className={cn(
								'stepper__indicator',
								variant === 'dots' && 'stepper__indicator--dots',
								isCompleted && 'stepper__indicator--completed',
								isActive && !isCompleted && 'stepper__indicator--active',
								!isActive && !isCompleted && 'stepper__indicator--inactive',
							)}
						>
							{variant !== 'dots' && isCompleted ? (
								<svg
									className="w-4 h-4"
									fill="currentColor"
									viewBox="0 0 20 20"
									role="img"
									aria-label="Completed"
								>
									<path
										fillRule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clipRule="evenodd"
									/>
								</svg>
							) : showNumbers && variant !== 'dots' ? (
								<span className="text-sm font-medium">{index + 1}</span>
							) : step.icon ? (
								<span className="text-sm">{step.icon}</span>
							) : null}
						</div>

						{showTitles && variant !== 'dots' && (
							<div
								className={cn(
									isHorizontal && 'stepper__title--horizontal',
									isVertical && 'stepper__title--vertical',
								)}
							>
								<span
									className={cn(
										'stepper__title',
										isActive ? 'stepper__title--active' : 'stepper__title--inactive',
									)}
								>
									{step.title}
								</span>
								{step.description && isVertical && (
									<p className="stepper__description">{step.description}</p>
								)}
							</div>
						)}

						{/* Connecting lines */}
						{index < steps.length - 1 && (
							<>
								{isVertical && (
									<div
										className={cn(
											'stepper__connector stepper__connector--vertical',
											isCompleted && 'stepper__connector--completed',
										)}
									/>
								)}
								{isHorizontal && (
									<div
										className={cn(
											'stepper__connector stepper__connector--horizontal',
											isCompleted && 'stepper__connector--completed',
										)}
									/>
								)}
							</>
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
	return <div className={cn('stepper__content', className)}>{children}</div>;
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
		<div className={cn('stepper__navigation', className)}>
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

			<div className="stepper__navigation-buttons">
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
