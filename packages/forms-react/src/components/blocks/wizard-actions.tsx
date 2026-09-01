import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useViewConfig, useViewContext } from '@/contexts/view-context';
import { DEFAULT_WIZARD_ACTION_LABELS, type WizardActionsConfig } from '@schema-engine/forms/recipes';

function resolveLabels(config: WizardActionsConfig) {
	return { ...DEFAULT_WIZARD_ACTION_LABELS, ...config.labels };
}

export function WizardActions() {
	const { navigation, form, steps, currentStepIndex } = useViewContext();
	const config = useViewConfig<WizardActionsConfig>('actions');
	const labels = resolveLabels(config);
	const appearance = config.appearance ?? 'default';
	const showStepCounter = config.showStepCounter ?? appearance === 'default';

	return (
		<div
			className={cn(
				'se-wizard-actions flex items-center justify-between gap-4',
				appearance === 'minimal' && 'w-full',
			)}
		>
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
					style={{ display: navigation.isLastStep ? 'inline-flex' : 'none' }}
					aria-label={labels.submitAriaLabel}
				>
					{form.isSubmitting ? labels.submitting : labels.submit}
				</Button>

				<Button
					type="button"
					onClick={navigation.goToNextStep}
					disabled={!navigation.canGoNext}
					style={{ display: navigation.isLastStep ? 'none' : 'inline-flex' }}
					aria-label={labels.nextAriaLabel}
				>
					{labels.next}
				</Button>
			</div>
		</div>
	);
}
