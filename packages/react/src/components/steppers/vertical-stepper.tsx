import type React from 'react';
import { cn } from '@/shadcn/lib/utils';
import type { BaseStepperConfig } from '@json-form-engine/core';
import { StepperProvider, useStepperContext } from './context';
import { useStepperContext as useGlobalStepperContext } from '@/contexts/stepper-context';

export interface VerticalStepsStepperConfig extends BaseStepperConfig {
	__id: 'vertical';
	showConnectors?: boolean;
}

/**
 * Vertical Steps Stepper Root Component
 * Shows steps as a vertical timeline with content on the right
 * Loads data from global context and provides it to child components via local context
 */
const VerticalStepsStepperRoot: React.FC<{ children: React.ReactNode; className?: string }> = ({
	children,
	className,
}) => {
	const globalContext = useGlobalStepperContext();

	return (
		<StepperProvider value={globalContext}>
			<div className={cn('vertical-stepper', className)}>{children}</div>
		</StepperProvider>
	);
};

/**
 * Vertical Steps Sidebar
 * Contains step indicators and navigation buttons
 */
function VerticalStepsSidebar({ className }: { className?: string }) {
	const { steps, currentStepIndex, navigation, form, config } = useStepperContext<VerticalStepsStepperConfig>();
	const { showConnectors = true } = config || {};

	return (
		<div className={cn('vertical-stepper__sidebar', className)}>
			<div className="vertical-stepper__steps">
				{showConnectors && (
					<>
						<div className="vertical-stepper__connector-line" />
						{steps.map((step, index: number) => {
							if (index === steps.length - 1) return null;
							const nextStep = steps[index + 1];
							return (
								<div
									key={`connector-${step.id}`}
									className={`vertical-stepper__connector-segment ${
										step.isCompleted && nextStep.isVisited
											? 'vertical-stepper__connector-segment--completed'
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

				<div className="vertical-stepper__steps-list">
					{steps.map((step, index: number) => (
						<button
							key={step.id}
							type="button"
							onClick={() => navigation.goToStep(index)}
							disabled={!step.isVisited && index > currentStepIndex}
							className={`vertical-stepper__step ${
								!step.isVisited && index > currentStepIndex
									? 'vertical-stepper__step--disabled'
									: 'vertical-stepper__step--clickable'
							}`}
						>
							<div
								className={`vertical-stepper__indicator ${
									step.isCompleted
										? 'vertical-stepper__indicator--completed'
										: step.isActive
											? 'vertical-stepper__indicator--active'
											: 'vertical-stepper__indicator--inactive'
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

							<div className="vertical-stepper__step-content">
								<div
									className={`vertical-stepper__step-title ${
										step.isActive
											? 'vertical-stepper__step-title--active'
											: 'vertical-stepper__step-title--inactive'
									}`}
								>
									{step.title || `Step ${index + 1}`}
								</div>
								{step.description && (
									<div className="vertical-stepper__step-description">{step.description}</div>
								)}
								{step.isActive && <div className="vertical-stepper__current-label">Current step</div>}
							</div>
						</button>
					))}
				</div>
			</div>

			<div className="vertical-stepper__navigation">
				<button
					type="button"
					onClick={() => navigation.goToPreviousStep()}
					disabled={navigation.isFirstStep}
					className={`vertical-stepper__nav-button vertical-stepper__nav-button--secondary ${
						navigation.isFirstStep ? 'vertical-stepper__nav-button--disabled' : ''
					}`}
				>
					Previous Step
				</button>

				{navigation.isLastStep ? (
					<button
						type="submit"
						className="vertical-stepper__nav-button vertical-stepper__nav-button--primary"
					>
						{form.isSubmitting ? 'Submitting...' : 'Complete Form'}
					</button>
				) : (
					<button
						type="button"
						onClick={() => navigation.goToNextStep()}
						disabled={!navigation.canGoNext}
						className={`vertical-stepper__nav-button vertical-stepper__nav-button--primary ${
							!navigation.canGoNext ? 'vertical-stepper__nav-button--disabled' : ''
						}`}
					>
						Next Step
					</button>
				)}
			</div>
		</div>
	);
}

/**
 * Vertical Steps Main Content
 * Displays the form content for the current step
 */
function VerticalStepsContent({ children, className }: { children: React.ReactNode; className?: string }) {
	return (
		<div className={cn('vertical-stepper__main-content', className)}>
			<div className="vertical-stepper__content-card">{children}</div>
		</div>
	);
}

export const VerticalStepsStepper = Object.assign(VerticalStepsStepperRoot, {
	Sidebar: VerticalStepsSidebar,
	Content: VerticalStepsContent,
});

/**
 * Vertical Steps Stepper Composed
 * Pre-built composition with default layout (used by registry)
 * Loads data from global context (provided by StepperRenderer)
 */
export const VerticalStepsStepperComposed: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	return (
		<VerticalStepsStepper>
			<VerticalStepsStepper.Sidebar />
			<VerticalStepsStepper.Content>{children}</VerticalStepsStepper.Content>
		</VerticalStepsStepper>
	);
};

import type { StepperRegistration } from '@json-form-engine/core/types';
import { VerticalStepperConfigSchema } from './vertical-stepper.types';

export const VerticalStepperRegistration: StepperRegistration<
	VerticalStepsStepperConfig,
	{ children?: React.ReactNode }
> = {
	__id: 'vertical',
	render: VerticalStepsStepperComposed,
	schema: VerticalStepperConfigSchema,
	metadata: {
		name: 'Vertical Stepper',
		description: 'Vertical sidebar stepper with step indicators and content area',
		icon: 'layout-sidebar',
	},
};
