import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import type { StepIndicatorsConfig } from '@schema-engine/forms/recipes';
import { useFormNavigation, useViewConfig, useViewContext } from '@schema-engine/forms-react/contexts';
import { useIsMobile } from '@schema-engine/forms-react/hooks';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/schema-engine/forms/lib/utils';

export function StepIndicators() {
	const { steps, currentStepIndex } = useViewContext();
	const navigation = useFormNavigation();
	const config = useViewConfig<StepIndicatorsConfig>('progress');
	const isMobile = useIsMobile();
	const {
		orientation = 'horizontal',
		showStepNumbers = true,
		showStepTitles = true,
		showStepDescriptions = false,
		labels,
	} = config;
	const sidebar = orientation === 'sidebar' && !isMobile;
	const regionLabel = labels?.regionAriaLabel ?? 'Form progress';
	const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
	const containerRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const currentStepElement = stepRefs.current[currentStepIndex];
		if (currentStepElement && containerRef.current) {
			currentStepElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
		}
	}, [currentStepIndex]);

	return (
		<nav
			aria-label={regionLabel}
			ref={containerRef}
			className={cn('relative flex min-w-0', sidebar ? 'overflow-visible' : 'overflow-x-auto scroll-smooth')}
		>
			<ol className={cn('relative flex', sidebar ? 'min-w-0 flex-col gap-1' : 'min-w-full gap-2')}>
				{steps.map((step, index) => {
					const isDisabled = !step.isVisited && index > currentStepIndex;
					return (
						<li
							key={step.id}
							ref={(element) => {
								stepRefs.current[index] = element;
							}}
							className={cn('flex', sidebar ? 'min-w-0 w-full' : 'min-w-30 flex-1')}
						>
							<Button
								type="button"
								variant="ghost"
								onClick={() => navigation.goToStep(index)}
								disabled={isDisabled}
								aria-current={step.isActive ? 'step' : undefined}
								className={cn(
									'flex h-auto w-full min-w-0 shrink gap-2 whitespace-normal rounded-xl p-3',
									sidebar
										? 'flex-row items-center justify-start text-left'
										: 'flex-col items-center text-center',
									step.isActive && 'bg-muted',
								)}
							>
								{showStepNumbers ? (
									<span
										className={cn(
											'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums',
											step.isCompleted && 'border-primary bg-primary text-primary-foreground',
											step.isActive && !step.isCompleted && 'border-primary text-primary',
											!step.isActive &&
												!step.isCompleted &&
												'border-border text-muted-foreground',
										)}
									>
										{step.isCompleted ? <Check className="size-4" aria-hidden /> : index + 1}
									</span>
								) : null}
								{showStepTitles || (showStepDescriptions && step.description) ? (
									<span
										className={cn(
											'min-w-0 space-y-1 leading-5',
											sidebar ? 'text-left' : 'w-full text-center',
										)}
									>
										{showStepTitles ? (
											<span
												className={cn(
													'block text-sm font-medium text-balance wrap-break-word',
													step.isActive ? 'text-foreground' : 'text-muted-foreground',
												)}
											>
												{step.title || `Step ${index + 1}`}
											</span>
										) : null}
										{showStepDescriptions && step.description ? (
											<span className="block text-xs text-muted-foreground">
												{step.description}
											</span>
										) : null}
									</span>
								) : null}
							</Button>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
