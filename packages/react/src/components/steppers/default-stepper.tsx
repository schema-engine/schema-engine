import type React from 'react';
import { cn } from '@/lib/utils';
import type { DefaultStepperConfig } from './default-stepper.types';
import { StepperProvider, useStepperContext } from './context';
import { useEffect, useRef } from 'react';
import { useStepperContext as useGlobalStepperContext } from '@/contexts/stepper-context';

/**
 * Default Stepper Root Component
 * Loads data from global context and provides it to child components via local context
 * Supports both horizontal (mobile-friendly) and sidebar (desktop) layouts
 */
const DefaultStepperRoot: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
	const globalContext = useGlobalStepperContext();
	const { config } = globalContext;
	const { orientation = 'horizontal' } = (config as DefaultStepperConfig) || {};

	return (
		<StepperProvider value={globalContext}>
			<div
				className={cn(
					'default-stepper',
					orientation === 'sidebar' ? 'default-stepper--sidebar' : 'default-stepper--horizontal',
					className,
				)}
			>
				{children}
			</div>
		</StepperProvider>
	);
};

/**
 * Default Stepper Progress Component
 * Displays step indicators with navigation
 * On mobile: horizontal scrollable steps
 * On desktop (sidebar orientation): vertical sidebar with connectors
 */
function DefaultStepperProgress({ className }: { className?: string }) {
	const { steps, currentStepIndex, navigation, form, config } = useStepperContext<DefaultStepperConfig>();
	const { orientation = 'horizontal' } = (config as DefaultStepperConfig) || {};
	const stepRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const currentStepElement = stepRefs.current[currentStepIndex];
		if (currentStepElement && containerRef.current) {
			currentStepElement.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
				inline: 'center',
			});
		}
	}, [currentStepIndex]);

	return (
		<div className={cn('default-stepper__progress-container', className)}>
			<div ref={containerRef} className="default-stepper__progress-wrapper">
				{orientation === 'sidebar' && (
					<>
						<div className="default-stepper__connector-line" />
						{steps.map((step, index: number) => {
							if (index === steps.length - 1) return null;
							const nextStep = steps[index + 1];
							return (
								<div
									key={`connector-${step.id}`}
									className={`default-stepper__connector-segment ${
										step.isCompleted && nextStep.isVisited
											? 'default-stepper__connector-segment--completed'
											: ''
									}`}
									style={
										{
											['--step-index' as string]: index,
											['--total-steps' as string]: steps.length,
										} as React.CSSProperties
									}
								/>
							);
						})}
					</>
				)}

				<div className="default-stepper__steps-list">
					{steps.map((step, index: number) => (
						<button
							key={step.id}
							ref={(el) => {
								stepRefs.current[index] = el;
							}}
							type="button"
							onClick={() => navigation.goToStep(index)}
							disabled={!step.isVisited && index > currentStepIndex}
							className={`default-stepper__step-button ${
								!step.isVisited && index > currentStepIndex
									? 'default-stepper__step--disabled'
									: 'default-stepper__step--clickable'
							}`}
						>
							<div
								className={`default-stepper__indicator ${
									step.isCompleted
										? 'default-stepper__indicator--completed'
										: step.isActive
											? 'default-stepper__indicator--active'
											: 'default-stepper__indicator--inactive'
								}`}
							>
								{step.isCompleted ? (
									<svg
										className="w-5 h-5 text-white"
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
								) : (
									<span className="text-sm font-semibold">{index + 1}</span>
								)}
							</div>

							<div className="default-stepper__step-info">
								<div
									className={`default-stepper__title ${
										step.isActive
											? 'default-stepper__title--active'
											: 'default-stepper__title--inactive'
									}`}
								>
									{step.title || `Step ${index + 1}`}
								</div>
								{step.description && (
									<div className="default-stepper__description">{step.description}</div>
								)}
								{step.isActive && <div className="default-stepper__current-label">Current step</div>}
							</div>
						</button>
					))}
				</div>
			</div>

			{orientation === 'sidebar' && (
				<div className="default-stepper__desktop-navigation">
					<button
						type="button"
						onClick={() => navigation.goToPreviousStep()}
						disabled={navigation.isFirstStep}
						className={`default-stepper__nav-button default-stepper__nav-button--secondary ${
							navigation.isFirstStep ? 'default-stepper__nav-button--disabled' : ''
						}`}
					>
						Previous Step
					</button>

					<button
						type="submit"
						style={{ display: navigation.isLastStep ? 'block' : 'none' }}
						className="default-stepper__nav-button default-stepper__nav-button--primary"
					>
						{form.isSubmitting ? 'Submitting...' : 'Complete Form'}
					</button>

					<button
						type="button"
						onClick={() => navigation.goToNextStep()}
						disabled={!navigation.canGoNext}
						style={{ display: navigation.isLastStep ? 'none' : 'block' }}
						className={`default-stepper__nav-button default-stepper__nav-button--primary ${
							!navigation.canGoNext ? 'default-stepper__nav-button--disabled' : ''
						}`}
					>
						Next Step
					</button>
				</div>
			)}
		</div>
	);
}

/**
 * Default Stepper Content
 * Wraps the form content for each step
 * In sidebar mode, wraps in a card. In horizontal mode, shows step header.
 */
function DefaultStepperContent({ children, className }: { children: React.ReactNode; className?: string }) {
	const { steps, currentStepIndex, config } = useStepperContext<DefaultStepperConfig>();
	const currentStep = steps[currentStepIndex];
	const { orientation = 'horizontal' } = config || {};

	if (orientation === 'sidebar') {
		return (
			<div className={cn('default-stepper__main-content', className)}>
				<div className="default-stepper__content-card">
					<h3 className="default-stepper__content-title">
						{currentStep?.title || `Step ${currentStepIndex + 1}`}
					</h3>
					{currentStep?.description && (
						<p className="default-stepper__content-description">{currentStep.description}</p>
					)}
					<div className="default-stepper__content-body">{children}</div>
				</div>
			</div>
		);
	}

	return (
		<div className={cn('default-stepper__content', className)}>
			<div className="default-stepper__step-header">
				<h2 className="default-stepper__step-title">{currentStep?.title || `Step ${currentStepIndex + 1}`}</h2>
				{currentStep?.description && (
					<p className="default-stepper__step-description">{currentStep.description}</p>
				)}
			</div>
			{children}
		</div>
	);
}

/**
 * Default Stepper Navigation
 * Provides Previous/Next/Submit buttons with step counter
 */
function DefaultStepperNavigation({ className }: { className?: string }) {
	const { steps, currentStepIndex, navigation, form } = useStepperContext();

	return (
		<div className={cn('default-stepper__navigation', className)}>
			<button
				type="button"
				onClick={() => navigation.goToPreviousStep()}
				disabled={navigation.isFirstStep}
				className={`default-stepper__nav-button default-stepper__nav-button--secondary ${
					navigation.isFirstStep ? 'default-stepper__nav-button--disabled' : ''
				}`}
			>
				Previous
			</button>

			<div className="default-stepper__step-counter">
				Step {currentStepIndex + 1} of {steps.length}
			</div>

			<button
				type="submit"
				style={{ display: navigation.isLastStep ? 'block' : 'none' }}
				className="default-stepper__nav-button default-stepper__nav-button--primary"
			>
				{form.isSubmitting ? 'Submitting...' : 'Submit'}
			</button>

			<button
				type="button"
				onClick={() => navigation.goToNextStep()}
				disabled={!navigation.canGoNext}
				style={{ display: navigation.isLastStep ? 'none' : 'block' }}
				className={`default-stepper__nav-button default-stepper__nav-button--primary ${
					!navigation.canGoNext ? 'default-stepper__nav-button--disabled' : ''
				}`}
			>
				Next
			</button>
		</div>
	);
}

export const DefaultStepper = Object.assign(DefaultStepperRoot, {
	Progress: DefaultStepperProgress,
	Content: DefaultStepperContent,
	Navigation: DefaultStepperNavigation,
});

/**
 * Default Stepper Composed
 * Pre-built composition with default layout (used by registry)
 * Loads data from global context (provided by StepperRenderer)
 * Uses the same Progress component for both orientations
 * CSS handles the differences between horizontal and sidebar layouts
 */
export const DefaultStepperComposed: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	const globalContext = useGlobalStepperContext();
	const { config } = globalContext;
	const { orientation = 'horizontal' } = (config as DefaultStepperConfig) || {};

	if (orientation === 'sidebar') {
		return (
			<DefaultStepper>
				<DefaultStepper.Progress />
				<div className="default-stepper__content-wrapper">
					<DefaultStepper.Content>{children}</DefaultStepper.Content>
					<DefaultStepper.Navigation className="default-stepper__mobile-navigation" />
				</div>
			</DefaultStepper>
		);
	}

	return (
		<DefaultStepper>
			<DefaultStepper.Progress />
			<DefaultStepper.Content>{children}</DefaultStepper.Content>
			<DefaultStepper.Navigation />
		</DefaultStepper>
	);
};
