import type React from 'react';
import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/components/schema-engine/forms/lib/utils';
import { useStepperContext } from '@schema-engine/forms-react/contexts/stepper-context';
import { useIsMobile } from '@schema-engine/forms-react/hooks';
import type { DefaultStepperConfig } from './default-stepper.types';

const DefaultStepperRoot: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
	const { config } = useStepperContext<DefaultStepperConfig>();
	const { orientation = 'horizontal' } = config;

	return (
		<div
			className={cn(
				'w-full',
				orientation === 'sidebar' ? 'flex flex-row gap-8 lg:gap-12' : 'flex flex-col gap-6',
				className,
			)}
		>
			{children}
		</div>
	);
};

function StepIndicators() {
	const { steps, currentStepIndex, navigation } = useStepperContext<DefaultStepperConfig>();
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
		<div ref={containerRef} className="relative flex overflow-x-auto scroll-px-4 scroll-smooth">
			<ol className="relative flex min-w-full gap-2 lg:gap-3">
				{steps.map((step, index) => {
					const isDisabled = !step.isVisited && index > currentStepIndex;

					return (
						<li key={step.id} className="flex min-w-[7.5rem] max-w-[8.75rem] flex-1 scroll-snap-start">
							<Button
								ref={(el) => {
									stepRefs.current[index] = el;
								}}
								type="button"
								variant="ghost"
								onClick={() => navigation.goToStep(index)}
								disabled={isDisabled}
								aria-current={step.isActive ? 'step' : undefined}
								className={cn(
									'flex h-auto w-full flex-col items-center gap-2 rounded-xl px-3 py-4 text-center',
									step.isActive && 'bg-muted',
								)}
							>
								<span
									className={cn(
										'flex size-8 items-center justify-center rounded-full border text-sm font-semibold',
										step.isCompleted && 'border-primary bg-primary text-primary-foreground',
										step.isActive && !step.isCompleted && 'border-primary text-primary',
										!step.isActive && !step.isCompleted && 'border-border text-muted-foreground',
									)}
								>
									{step.isCompleted ? <Check className="size-4" aria-hidden /> : index + 1}
								</span>
								<span className="space-y-1">
									<span
										className={cn(
											'block text-sm font-medium',
											step.isActive ? 'text-foreground' : 'text-muted-foreground',
										)}
									>
										{step.title || `Step ${index + 1}`}
									</span>
									{step.description && (
										<span className="block text-xs text-muted-foreground">{step.description}</span>
									)}
								</span>
							</Button>
						</li>
					);
				})}
			</ol>
		</div>
	);
}

function DefaultStepperProgress({ className }: { className?: string }) {
	return (
		<nav aria-label="Form progress" className={cn('w-full', className)}>
			<StepIndicators />
		</nav>
	);
}

function DefaultStepperContent({ children, className }: { children: React.ReactNode; className?: string }) {
	const { steps, currentStepIndex, config } = useStepperContext<DefaultStepperConfig>();
	const currentStep = steps[currentStepIndex];
	const { orientation = 'horizontal' } = config || {};

	if (orientation === 'sidebar') {
		return (
			<div className={cn('min-w-0 flex-1', className)}>
				<div className="rounded-xl border bg-card p-6 shadow-sm">
					<h3 className="text-lg font-semibold">{currentStep?.title || `Step ${currentStepIndex + 1}`}</h3>
					{currentStep?.description && (
						<p className="mt-1 text-sm text-muted-foreground">{currentStep.description}</p>
					)}
					<div className="mt-6">{children}</div>
				</div>
			</div>
		);
	}

	return (
		<div className={cn('space-y-6', className)}>
			<header className="default-stepper__header">
				<h2 className="text-xl font-semibold">{currentStep?.title || `Step ${currentStepIndex + 1}`}</h2>
				{currentStep?.description && (
					<p className="mt-1 text-sm text-muted-foreground">{currentStep.description}</p>
				)}
			</header>
			{children}
		</div>
	);
}

function DefaultStepperNavigation({ className }: { className?: string }) {
	const { steps, currentStepIndex, navigation, form } = useStepperContext<DefaultStepperConfig>();

	return (
		<div className={cn('flex items-center justify-between gap-4', className)}>
			<Button
				type="button"
				variant="outline"
				onClick={() => navigation.goToPreviousStep()}
				disabled={navigation.isFirstStep}
			>
				Previous
			</Button>

			<Badge variant="secondary">
				Step {currentStepIndex + 1} of {steps.length}
			</Badge>

			<div className="flex gap-2">
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
		</div>
	);
}

export const DefaultStepper = Object.assign(DefaultStepperRoot, {
	Progress: DefaultStepperProgress,
	Content: DefaultStepperContent,
	Navigation: DefaultStepperNavigation,
});

export const DefaultStepperComposed: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	const { config } = useStepperContext<DefaultStepperConfig>();
	const isMobile = useIsMobile();
	const isSidebarMode = config.orientation === 'sidebar' && !isMobile;

	if (isSidebarMode) {
		return (
			<div className="flex w-full flex-row gap-8 lg:gap-12">
				<aside className="w-72 shrink-0 rounded-2xl border bg-muted/30 p-4">
					<DefaultStepperProgress />
				</aside>
				<div className="flex min-w-0 flex-1 flex-col gap-6">
					<DefaultStepperContent>{children}</DefaultStepperContent>
					<DefaultStepperNavigation />
				</div>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col gap-6">
			<DefaultStepperProgress />
			<DefaultStepperContent>{children}</DefaultStepperContent>
			<DefaultStepperNavigation />
		</div>
	);
};
