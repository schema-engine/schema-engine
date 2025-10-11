import { cn } from '@/shadcn/lib/utils';
import type { BaseStepperConfig } from './types';
import { StepperProvider, useStepperContext } from './context';
import { useStepperContext as useGlobalStepperContext } from '@/contexts/stepper-context';
import type React from 'react';

export interface MinimalistStepperConfig extends BaseStepperConfig {
	stepperId: 'minimalist';
	showProgress?: boolean;
}

/**
 * Minimalist Stepper Root Component
 * Loads data from global context and provides it to child components via local context
 */
const MinimalistStepperRoot: React.FC<{ children: React.ReactNode; className?: string }> = ({
	children,
	className,
}) => {
	const globalContext = useGlobalStepperContext();

	return (
		<StepperProvider value={globalContext}>
			<div className={cn('minimalist-stepper', className)}>{children}</div>
		</StepperProvider>
	);
};

/**
 * Minimalist Stepper Progress Component
 * Displays a simple progress bar with percentage
 */
function MinimalistStepperProgress({ className }: { className?: string }) {
	const { steps, currentStepIndex, config } = useStepperContext<MinimalistStepperConfig>();
	const { showProgress = true } = config || {};

	if (!showProgress) return null;

	return (
		<div className={cn('minimalist-stepper__progress', className)}>
			<div className="minimalist-stepper__progress-info">
				<span>Progress</span>
				<span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}% complete</span>
			</div>
			<div className="minimalist-stepper__progress-bar">
				<div
					className="minimalist-stepper__progress-fill"
					style={{
						width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
					}}
				/>
			</div>
		</div>
	);
}

/**
 * Minimalist Stepper Header Component
 * Displays step information and title
 */
function MinimalistStepperHeader({ className }: { className?: string }) {
	const { steps, currentStepIndex } = useStepperContext<MinimalistStepperConfig>();
	const currentStep = steps[currentStepIndex];

	return (
		<div className={cn('minimalist-stepper__header-info', className)}>
			<div className="minimalist-stepper__step-info">
				Step {currentStepIndex + 1} of {steps.length}
			</div>
			<h2 className="minimalist-stepper__title">{currentStep?.title || `Step ${currentStepIndex + 1}`}</h2>
			{currentStep?.description && <p className="minimalist-stepper__description">{currentStep.description}</p>}
		</div>
	);
}

/**
 * Minimalist Stepper Content Component
 * Wraps the form content for each step
 */
function MinimalistStepperContent({ children, className }: { children: React.ReactNode; className?: string }) {
	return <div className={cn('minimalist-stepper__content', className)}>{children}</div>;
}

/**
 * Minimalist Stepper Navigation Component
 * Provides simple previous/next navigation
 */
function MinimalistStepperNavigation({ className }: { className?: string }) {
	const { navigation, form } = useStepperContext<MinimalistStepperConfig>();

	return (
		<div className={cn('minimalist-stepper__navigation', className)}>
			<button
				type="button"
				onClick={() => navigation.goToPreviousStep()}
				disabled={navigation.isFirstStep}
				className={`minimalist-stepper__nav-button minimalist-stepper__nav-button--text ${
					navigation.isFirstStep ? 'minimalist-stepper__nav-button--text--disabled' : ''
				}`}
			>
				← Previous
			</button>

			{navigation.isLastStep ? (
				<button
					type="submit"
					className="minimalist-stepper__nav-button minimalist-stepper__nav-button--primary"
				>
					{form.isSubmitting ? 'Submitting...' : 'Submit'}
				</button>
			) : (
				<button
					type="button"
					onClick={() => navigation.goToNextStep()}
					disabled={!navigation.canGoNext}
					className={`minimalist-stepper__nav-button minimalist-stepper__nav-button--primary ${
						!navigation.canGoNext ? 'minimalist-stepper__nav-button--primary--disabled' : ''
					}`}
				>
					Next →
				</button>
			)}
		</div>
	);
}

/**
 * Minimalist Stepper with Compound Pattern
 * Simple text-based stepper with optional progress bar focused on clarity
 */
export const MinimalistStepper = Object.assign(MinimalistStepperRoot, {
	Progress: MinimalistStepperProgress,
	Header: MinimalistStepperHeader,
	Content: MinimalistStepperContent,
	Navigation: MinimalistStepperNavigation,
});

/**
 * Default Minimalist Stepper Layout
 * Pre-composed layout using the compound components directly
 * Loads data from global context (provided by StepperRenderer)
 */
export const MinimalistStepperComposed: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	return (
		<MinimalistStepper>
			<div className="minimalist-stepper__header">
				<MinimalistStepper.Progress />
				<MinimalistStepper.Header />
			</div>
			<MinimalistStepper.Content>{children}</MinimalistStepper.Content>
			<MinimalistStepper.Navigation />
		</MinimalistStepper>
	);
};

import type { StepperRegistration } from '@json-form-engine/core/types';
import { MinimalistStepperConfigSchema } from './minimalist-stepper.types';

export const MinimalistStepperRegistration: StepperRegistration<
	MinimalistStepperConfig,
	{ children?: React.ReactNode }
> = {
	stepperId: 'minimalist',
	render: MinimalistStepperComposed,
	schema: MinimalistStepperConfigSchema,
	metadata: {
		name: 'Minimalist Stepper',
		description: 'Clean minimalist stepper with progress bar and simple navigation',
		icon: 'minimize',
	},
};
