import { DEFAULT_WIZARD_ACTION_LABELS, type WizardActionsConfig } from '@schema-engine/forms/recipes';
import { useViewConfig, useViewContext } from '@schema-engine/forms-react/contexts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/schema-engine/forms/lib/utils';

export function WizardActions() {
	const { navigation, form, steps, currentStepIndex } = useViewContext();
	const config = useViewConfig<WizardActionsConfig>('actions');
	const labels = { ...DEFAULT_WIZARD_ACTION_LABELS, ...config.labels };
	const appearance = config.appearance ?? 'default';
	const showStepCounter = config.showStepCounter ?? appearance === 'default';

	return (
		<div className={cn('flex items-center justify-between gap-4', appearance === 'minimal' && 'w-full')}>
			<Button
				type="button"
				variant={appearance === 'minimal' ? 'ghost' : 'outline'}
				onClick={navigation.goToPreviousStep}
				disabled={navigation.isFirstStep}
				aria-label={labels.previousAriaLabel}
			>
				{labels.previous}
			</Button>
			{showStepCounter ? (
				<Badge variant="secondary" aria-live="polite">
					Step {currentStepIndex + 1} of {steps.length}
				</Badge>
			) : null}
			<div className="flex gap-2">
				<Button
					type="submit"
					className={cn(!navigation.isLastStep && 'hidden')}
					aria-label={labels.submitAriaLabel}
				>
					{form.isSubmitting ? labels.submitting : labels.submit}
				</Button>
				<Button
					type="button"
					className={cn(navigation.isLastStep && 'hidden')}
					onClick={navigation.goToNextStep}
					disabled={!navigation.canGoNext}
					aria-label={labels.nextAriaLabel}
				>
					{labels.next}
				</Button>
			</div>
		</div>
	);
}
