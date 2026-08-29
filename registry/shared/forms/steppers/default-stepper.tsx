import type React from 'react';
import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
				'min-w-0 w-full',
				orientation === 'sidebar' ? 'flex flex-row gap-8 lg:gap-12' : 'flex flex-col gap-6',
				className,
			)}
		>
			{children}
		</div>
	);
};

function StepIndicators({ sidebar = false }: { sidebar?: boolean }) {
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
		<div
			ref={containerRef}
			className={cn('relative flex min-w-0', sidebar ? 'overflow-visible' : 'overflow-x-auto scroll-smooth')}
		>
			<ol className={cn('relative flex', sidebar ? 'min-w-0 flex-col gap-1' : 'min-w-full gap-2')}>
				{steps.map((step, index) => {
					const isDisabled = !step.isVisited && index > currentStepIndex;

					return (
						<li key={step.id} className={cn('flex', sidebar ? 'min-w-0 w-full' : 'min-w-30 flex-1')}>
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
									'flex h-auto w-full gap-2 rounded-xl p-3 text-center',
									sidebar
										? 'flex-row items-start justify-start py-3 text-left'
										: 'flex-col items-center',
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
								<span className={cn('space-y-1', sidebar && 'text-left')}>
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

function DefaultStepperProgress({ className, sidebar = false }: { className?: string; sidebar?: boolean }) {
	return (
		<nav aria-label="Form progress" className={cn('w-full', className)}>
			<StepIndicators sidebar={sidebar} />
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
				<h3 className="text-lg font-semibold">{currentStep?.title || `Step ${currentStepIndex + 1}`}</h3>
				{currentStep?.description && (
					<p className="mt-1 text-sm text-muted-foreground">{currentStep.description}</p>
				)}
				<div className="mt-6">{children}</div>
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
			<div className="flex w-full flex-row">
				<aside className="w-72 shrink-0 pr-8 lg:pr-12">
					<DefaultStepperProgress sidebar />
				</aside>
				<Separator orientation="vertical" />
				<div className="flex min-w-0 flex-1 flex-col gap-6 pl-8 lg:pl-12">
					<DefaultStepperContent>{children}</DefaultStepperContent>
					<DefaultStepperNavigation />
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-w-0 w-full flex-col gap-6">
			<DefaultStepperProgress />
			<DefaultStepperContent>{children}</DefaultStepperContent>
			<DefaultStepperNavigation />
		</div>
	);
};
