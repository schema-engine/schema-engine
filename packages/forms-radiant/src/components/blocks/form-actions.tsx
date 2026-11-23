import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { isSubmissionBusy } from '@schema-engine/forms';
import { type FormActionsConfig } from '@schema-engine/forms/recipes/built-in';
import type { RecipeSlotContext } from '@/recipes/types';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';

/**
 * Submit-only action bar for single-step recipes.
 *
 * @remarks
 * Wizard recipes author Previous/Next/Submit through `se-wizard-actions`;
 * single-step shells need a plain submit affordance. The block reads the
 * `actions` slot config for labels and alignment, and `formInstanceContext`
 * for the submitting state. No `config` prop: nothing here derives from steps.
 *
 * @element se-form-actions
 */
@customElement('se-form-actions')
export class FormActionsElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: { slotConfig?: FormActionsConfig };

	@prop({ type: Object }) slotConfig?: FormActionsConfig;

	@contextSelector({ context: formInstanceContext })
	protected instance?: FormInstanceContextValue;

	override render(): JsxRenderable {
		if (!this.slotConfig) return null;
		const { labels, align } = this.slotConfig;
		const isSubmitting = this.instance ? isSubmissionBusy(this.instance.submission.status) : false;
		return (
			<div classes={['se-form-actions', `se-form-actions--align-${align}`]}>
				<RuiButton type="submit" prop:disabled={isSubmitting} aria-label={labels.submitAriaLabel}>
					{isSubmitting ? labels.submitting : labels.submit}
				</RuiButton>
			</div>
		);
	}
}

export function FormActionsBlock(context?: RecipeSlotContext<FormActionsConfig>): JsxRenderable {
	return <FormActionsElement slotConfig={context?.slotConfig} />;
}
