import type React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/components/schema-engine/forms/lib/utils';
import { useStepperContext } from '@schema-engine/forms-react/contexts/stepper-context';
import type { MinimalistStepperConfig } from './minimalist-stepper.types';

const MinimalistStepperRoot: React.FC<{ children: React.ReactNode; className?: string }> = ({
	children,
	className,
}) => <div className={cn('flex w-full flex-col gap-6', className)}>{children}</div>;

function MinimalistStepperProgress({ className }: { className?: string }) {
	const { steps, currentStepIndex, config } = useStepperContext<MinimalistStepperConfig>();
	const { showProgress = true } = config;

	if (!showProgress) return null;

	const progressValue = ((currentStepIndex + 1) / steps.length) * 100;

	return (
		<div className={cn('space-y-2', className)}>
			<div className="flex items-center justify-between text-sm">
				<span>Progress</span>
				<span className="text-muted-foreground tabular-nums">{Math.round(progressValue)}%</span>
			</div>
			<Progress value={progressValue} />
		</div>
	);
}

function MinimalistStepperHeader({ className }: { className?: string }) {
	const { steps, currentStepIndex } = useStepperContext<MinimalistStepperConfig>();
	const currentStep = steps[currentStepIndex];

	return (
		<header className={cn('space-y-1', className)}>
			<p className="text-sm text-muted-foreground">
				Step {currentStepIndex + 1} of {steps.length}
			</p>
			<h2 className="text-xl font-semibold">{currentStep?.title || `Step ${currentStepIndex + 1}`}</h2>
			{currentStep?.description && <p className="text-sm text-muted-foreground">{currentStep.description}</p>}
		</header>
	);
}

function MinimalistStepperContent({ children, className }: { children: React.ReactNode; className?: string }) {
	return <div className={cn(className)}>{children}</div>;
}

function MinimalistStepperNavigation({ className }: { className?: string }) {
	const { navigation, form } = useStepperContext<MinimalistStepperConfig>();

	return (
		<div className={cn('flex items-center justify-between gap-4', className)}>
			<Button
				type="button"
				variant="ghost"
				onClick={() => navigation.goToPreviousStep()}
				disabled={navigation.isFirstStep}
			>
				Previous
			</Button>

			<Button type="submit" style={{ display: navigation.isLastStep ? 'inline-flex' : 'none' }}>
				{form.isSubmitting ? 'Submitting...' : 'Submit'}
			</Button>

			<Button
				type="button"
				onClick={() => navigation.goToNextStep()}
				disabled={!navigation.canGoNext}
				style={{ display: navigation.isLastStep ? 'none' : 'inline-flex' }}
			>
				Next
			</Button>
		</div>
	);
}

export const MinimalistStepper = Object.assign(MinimalistStepperRoot, {
	Progress: MinimalistStepperProgress,
	Header: MinimalistStepperHeader,
	Content: MinimalistStepperContent,
	Navigation: MinimalistStepperNavigation,
});

export const MinimalistStepperComposed: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	return (
		<MinimalistStepper>
			<div className="space-y-4">
				<MinimalistStepper.Progress />
				<MinimalistStepper.Header />
			</div>
			<MinimalistStepper.Content>{children}</MinimalistStepper.Content>
			<MinimalistStepper.Navigation />
		</MinimalistStepper>
	);
};
