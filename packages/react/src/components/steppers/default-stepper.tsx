import type React from 'react';
import { cn } from '@/shadcn/lib/utils';
import type { DefaultStepperConfig } from './default-stepper.types';
import { StepperProvider, useStepperContext } from './context';
import { useEffect, useRef } from 'react';
import { useStepperContext as useGlobalStepperContext } from '@/contexts/stepper-context';

/**
 * Default Stepper Root Component
 * Loads data from global context and provides it to child components via local context
 */
const DefaultStepperRoot: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
	const globalContext = useGlobalStepperContext();

	return (
		<StepperProvider value={globalContext}>
			<div className={cn('default-stepper', className)}>{children}</div>
		</StepperProvider>
	);
};

/**
 * Default Stepper Progress Component
 * Displays steps with connecting lines and clickable step indicators
 */
function DefaultStepperProgress({ className }: { className?: string }) {
	const { steps, currentStepIndex, navigation, config } = useStepperContext<DefaultStepperConfig>();
	const { showStepNumbers = true, showStepTitles = true, showStepDescriptions = false } = config || {};
	const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const currentStepElement = stepRefs.current[currentStepIndex];
		if (currentStepElement && containerRef.current) {
			currentStepElement.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
				inline: 'start',
			});
		}
	}, [currentStepIndex]);

	return (
		<div ref={containerRef} className={cn('default-stepper__container', className)}>
			<div className="default-stepper__stepper-wrapper">
				<div className="default-stepper__steps">
					{steps.map((step, index: number) => (
						<div
							key={step.id}
							ref={(el) => {
								stepRefs.current[index] = el;
							}}
							className="default-stepper__step"
						>
							<button
								type="button"
								onClick={() => navigation.goToStep(index)}
								disabled={!step.isVisited && index > currentStepIndex}
								className={`default-stepper__step-content ${
									!step.isVisited && index > currentStepIndex
										? 'default-stepper__step--disabled'
										: 'default-stepper__step--clickable'
								}`}
							>
								<div
									className={`default-stepper__circle ${
										step.isCompleted
											? 'default-stepper__circle--completed'
											: step.isActive
												? 'default-stepper__circle--active'
												: 'default-stepper__circle--inactive'
									}`}
								>
									{step.isCompleted ? (
										<svg
											className="h-5 w-5"
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
									) : showStepNumbers ? (
										<span>{index + 1}</span>
									) : null}
								</div>

								<div className="default-stepper__step-info">
									{showStepTitles && step.title && (
										<h3
											className={`default-stepper__title ${
												step.isActive
													? 'default-stepper__title--active'
													: step.isCompleted
														? 'default-stepper__title--completed'
														: 'default-stepper__title--inactive'
											}`}
										>
											{step.title}
										</h3>
									)}
									{showStepDescriptions && step.description && (
										<p
											className={`default-stepper__description ${
												step.isActive
													? 'default-stepper__description--active'
													: step.isCompleted
														? 'default-stepper__description--completed'
														: 'default-stepper__description--inactive'
											}`}
										>
											{step.description}
										</p>
									)}
								</div>
							</button>

							{index < steps.length - 1 && (
								<div className="default-stepper__connector">
									<div
										className={`default-stepper__connector-line ${
											step.isCompleted
												? 'default-stepper__connector-line--completed'
												: 'default-stepper__connector-line--inactive'
										}`}
									/>
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

/**
 * Default Stepper Content
 * Wraps the form content for each step
 */
function DefaultStepperContent({ children, className }: { children: React.ReactNode; className?: string }) {
	const { steps, currentStepIndex } = useStepperContext<DefaultStepperConfig>();
	const currentStep = steps[currentStepIndex];

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

			{navigation.isLastStep ? (
				<button type="submit" className="default-stepper__nav-button default-stepper__nav-button--primary">
					{form.isSubmitting ? 'Submitting...' : 'Submit'}
				</button>
			) : (
				<button
					type="button"
					onClick={() => navigation.goToNextStep()}
					disabled={!navigation.canGoNext}
					className={`default-stepper__nav-button default-stepper__nav-button--primary ${
						!navigation.canGoNext ? 'default-stepper__nav-button--disabled' : ''
					}`}
				>
					Next
				</button>
			)}
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
 */
export const DefaultStepperComposed: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	return (
		<DefaultStepper>
			<DefaultStepper.Progress />
			<DefaultStepper.Content>{children}</DefaultStepper.Content>
			<DefaultStepper.Navigation />
		</DefaultStepper>
	);
};

import type { StepperRegistration } from '@json-form-engine/core/types';
import { DefaultStepperConfigSchema } from './default-stepper.types';

export const DefaultStepperRegistration: StepperRegistration<DefaultStepperConfig, { children?: React.ReactNode }> = {
	__id: 'default',
	render: DefaultStepperComposed,
	schema: DefaultStepperConfigSchema,
	metadata: {
		name: 'Default Stepper',
		description: 'Horizontal stepper with progress indicators and navigation buttons',
		icon: 'steps',
	},
};
