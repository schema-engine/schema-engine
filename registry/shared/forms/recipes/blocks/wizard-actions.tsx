import { formatStepCounter, WizardActionsConfigSchema } from '@schema-engine/forms/recipes/built-in';
import { useViewConfig, useViewContext } from '@schema-engine/forms-react/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/schema-engine/forms/lib/utils';

/**
 * @remarks
 * Next and Submit carry distinct keys so React replaces the button instead of turning
 * Next into a submit button while its click is still being handled, which submitted the
 * form on arriving at the last step.
 */
export function WizardActions() {
	const { navigation, form, steps, currentStepIndex } = useViewContext();
	const { labels, appearance, showStepCounter } = useViewConfig('actions', WizardActionsConfigSchema);

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
					{formatStepCounter(labels.stepCounter, currentStepIndex + 1, steps.length)}
				</Badge>
			) : null}
			<div className="flex gap-2">
				{navigation.isLastStep ? (
					<Button key="submit" type="submit" aria-label={labels.submitAriaLabel}>
						{form.isSubmitting ? labels.submitting : labels.submit}
					</Button>
				) : (
					<Button
						key="next"
						type="button"
						onClick={navigation.goToNextStep}
						disabled={!navigation.canGoNext}
						aria-label={labels.nextAriaLabel}
					>
						{labels.next}
					</Button>
				)}
			</div>
		</div>
	);
}
