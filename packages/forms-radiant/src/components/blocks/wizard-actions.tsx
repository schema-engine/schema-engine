import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { isSubmissionBusy } from '@schema-engine/forms';
import { formatStepLabel, type WizardActionsConfig } from '@schema-engine/forms/recipes/built-in';
import type { FormMeta } from '@/lib/instance-view.js';
import type { RecipeSlotContext } from '../../recipes/types.js';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context.js';
import { deriveFormSteps, deriveInitialInstance, deriveNavigation } from '@/lib/instance-view.js';

/**
 * @remarks
 * The submit button is rendered only on the last step. A hidden submit button is still the form's default button, so
 * Enter in a field on an earlier step would submit the form.
 */
@customElement('se-wizard-actions')
export class WizardActionsElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: { meta?: FormMeta; slotConfig?: WizardActionsConfig };

	@prop({ type: Object }) meta?: FormMeta;
	@prop({ type: Object }) slotConfig?: WizardActionsConfig;

	@contextSelector({ context: formInstanceContext })
	protected instance?: FormInstanceContextValue;

	private readonly goPrevious = (): void => {
		void this.instance?.back();
	};

	private readonly goNext = (): void => {
		void this.instance?.next();
	};

	/**
	 * @remarks
	 * The forward button is keyed because Radiant now keeps an element when only its attributes change. Without
	 * keys, the click on Next would flip the same button to `type="submit"` before the browser runs its
	 * activation behaviour, and that click would submit the form.
	 */
	override render(): JsxRenderable {
		const meta = this.meta;
		if (!meta) return null;
		const instance = this.instance ?? deriveInitialInstance(meta);

		if (!this.slotConfig) return null;
		const { labels, variant, showStepCounter } = this.slotConfig;
		const { isFirstStep, isLastStep: last } = deriveNavigation(meta, instance);
		const steps = deriveFormSteps(meta, instance);
		const submitting = isSubmissionBusy(instance.submission.status);
		return (
			<div classes={['se-wizard-actions', variant === 'minimal' && 'se-wizard-actions--minimal']}>
				<RuiButton
					type="button"
					variant={variant === 'minimal' ? 'ghost' : 'outline'}
					on:click={this.goPrevious}
					prop:disabled={isFirstStep}
					aria-label={labels.previousAriaLabel}
				>
					{labels.previous}
				</RuiButton>
				{showStepCounter ? (
					<span class="se-wizard-actions__counter" aria-live="polite">
						{formatStepLabel(
							labels.stepCounter,
							Math.max(
								steps.findIndex(({ isActive }) => isActive),
								0,
							) + 1,
							steps.length,
						)}
					</span>
				) : null}
				<div class="se-wizard-actions__forward">
					{last ? (
						<RuiButton
							key="submit"
							type="submit"
							prop:disabled={submitting}
							aria-label={labels.submitAriaLabel}
						>
							{submitting ? labels.submitting : labels.submit}
						</RuiButton>
					) : (
						<RuiButton key="next" type="button" on:click={this.goNext} aria-label={labels.nextAriaLabel}>
							{labels.next}
						</RuiButton>
					)}
				</div>
			</div>
		);
	}
}

export function WizardActionsBlock(context?: RecipeSlotContext<WizardActionsConfig>): JsxRenderable {
	return <WizardActionsElement meta={context?.meta} slotConfig={context?.slotConfig} />;
}
