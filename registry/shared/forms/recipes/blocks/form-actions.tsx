import { FormActionsConfigSchema } from '@schema-engine/forms/recipes/built-in';
import { useViewConfig, useViewContext } from '@schema-engine/forms-react/hooks';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/schema-engine/forms/lib/utils';

/**
 * Submit-only action bar for single-step recipes.
 *
 * @remarks Wizard recipes author Previous/Next/Submit through {@link WizardActions};
 * single-step shells need a plain submit affordance. Reads the `actions` slot
 * config for labels and alignment, and the view context for the submitting state.
 */
export function FormActions() {
	const { form } = useViewContext();
	const { labels, align } = useViewConfig('actions', FormActionsConfigSchema);

	return (
		<div className={cn('se-form-actions', `se-form-actions--align-${align}`)}>
			<Button data-se-control type="submit" aria-label={labels.submitAriaLabel}>
				{form.isSubmitting ? labels.submitting : labels.submit}
			</Button>
		</div>
	);
}
