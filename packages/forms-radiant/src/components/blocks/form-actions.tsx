import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { getSlotConfig } from '@schema-engine/forms/recipes';
import { FormActionsConfigSchema } from '@schema-engine/forms/recipes/built-in';
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
	@prop({ type: Object }) viewConfig?: Record<string, unknown>;

	@contextSelector({ context: formInstanceContext })
	instance?: FormInstanceContextValue;

	override render(): JsxRenderable {
		const { labels, align } = getSlotConfig(this.viewConfig ?? {}, 'actions', FormActionsConfigSchema);
		const isSubmitting = this.instance?.isSubmitting ?? false;
		return (
			<div classes={['se-form-actions', `se-form-actions--align-${align}`]}>
				<RuiButton type="submit" aria-label={labels.submitAriaLabel}>
					{isSubmitting ? labels.submitting : labels.submit}
				</RuiButton>
			</div>
		);
	}
}

export function FormActionsBlock(context?: { viewConfig?: Record<string, unknown> }): JsxRenderable {
	return jsx('se-form-actions', {
		viewConfig: context?.viewConfig ?? {},
	});
}
