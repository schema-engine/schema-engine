import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { formatStepLabel, StepIndicatorsConfigSchema } from '@schema-engine/forms/recipes/built-in';
import { useFormNavigation, useIsMobile, useViewConfig, useViewContext } from '@schema-engine/forms-react/hooks';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/schema-engine/forms/lib/utils';

export function StepIndicators() {
	const { steps, currentStepIndex } = useViewContext();
	const navigation = useFormNavigation();
	const { orientation, showStepNumbers, showStepTitles, showStepDescriptions, labels } = useViewConfig(
		'progress',
		StepIndicatorsConfigSchema,
	);
	const isMobile = useIsMobile();
	const sidebar = orientation === 'sidebar' && !isMobile;
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
			aria-label={labels.regionAriaLabel}
			ref={containerRef}
			className={cn('se-step-indicators', sidebar && 'se-step-indicators--sidebar')}
		>
			<ol className="se-step-indicators__list">
				{steps.map((step, index) => {
					const isDisabled = !step.isVisited && index > currentStepIndex;
					return (
						<li
							key={step.id}
							ref={(element) => {
								stepRefs.current[index] = element;
							}}
							className="se-step-indicators__item"
						>
							<Button
								type="button"
								variant="ghost"
								onClick={() => navigation.goToStep(index)}
								disabled={isDisabled}
								aria-current={step.isActive ? 'step' : undefined}
								className={cn(
									'se-step-indicators__button h-auto whitespace-normal rounded-xl p-3',
									sidebar
										? 'flex-row items-center justify-start text-left'
										: 'flex-col items-center text-center',
									step.isActive && 'bg-muted',
								)}
							>
								{showStepNumbers ? (
									<span
										className={cn(
											'se-step-indicators__number border text-sm font-semibold tabular-nums',
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
									<span className="se-step-indicators__copy">
										{showStepTitles ? (
											<span
												className={cn(
													'se-step-indicators__title text-sm font-medium',
													step.isActive ? 'text-foreground' : 'text-muted-foreground',
												)}
											>
												{step.title ||
													formatStepLabel(labels.untitledStep, index + 1, steps.length)}
											</span>
										) : null}
										{showStepDescriptions && step.description ? (
											<span className="block text-xs text-muted-foreground">
												{step.description}
											</span>
										) : null}
									</span>
								) : null}
								{step.isCompleted ? (
									<span className="sr-only">
										{formatStepLabel(labels.completed, index + 1, steps.length)}
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
