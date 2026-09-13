/** @jsxImportSource react */
import { DEFAULT_FORM_ACTION_LABELS, type FormActionsConfig } from '@schema-engine/forms/recipes';
import { useViewConfig, useViewContext } from '@schema-engine/forms-react/contexts';
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
	const config = useViewConfig<FormActionsConfig>('actions');
	const labels = { ...DEFAULT_FORM_ACTION_LABELS, ...config.labels };
	const align = config.align ?? 'end';

	return (
		<div
			className={cn(
				'flex w-full min-w-0',
				align === 'start' && 'justify-start',
				align === 'center' && 'justify-center',
				align === 'end' && 'justify-end',
			)}
		>
			<Button type="submit" aria-label={labels.submitAriaLabel}>
				{form.isSubmitting ? labels.submitting : labels.submit}
			</Button>
		</div>
	);
}
