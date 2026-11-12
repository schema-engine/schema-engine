import { contextSelector } from '@ecopages/radiant/context';
import { prop, RadiantElement } from '@ecopages/radiant';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { formatStepLabel, type WizardActionsConfig } from '@schema-engine/forms/recipes/built-in';
import type { FormMeta } from '@/lib/instance-view';
import type { RecipeSlotContext } from '@/recipes/types';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { deriveFormSteps, deriveInitialInstance } from '@/lib/instance-view';
import { formElement } from '@/lib/define-element';

/**
 * @remarks
 * The submit button is rendered only on the last step. A hidden submit button is still the form's default button, so
 * Enter in a field on an earlier step would submit the form.
 */
@formElement('se-wizard-actions')
export class WizardActionsElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: { meta?: FormMeta; slotConfig?: WizardActionsConfig };

	@prop({ type: Object }) meta?: FormMeta;
	@prop({ type: Object }) slotConfig?: WizardActionsConfig;

	@contextSelector({ context: formInstanceContext })
	protected instance?: FormInstanceContextValue;

	private readonly goPrevious = (): void => {
		void this.instance?.goToPreviousStep();
	};

	private readonly goNext = (): void => {
		void this.instance?.goToNextStep();
	};

	override render(): JsxRenderable {
		const meta = this.meta;
		if (!meta) return null;
		const instance = this.instance ?? deriveInitialInstance(meta);

		if (!this.slotConfig) return null;
		const { labels, variant, showStepCounter } = this.slotConfig;
		const last = instance.currentStep >= instance.totalSteps - 1;
		const steps = deriveFormSteps(meta, instance);
		return (
			<div classes={['se-wizard-actions', variant === 'minimal' && 'se-wizard-actions--minimal']}>
				<RuiButton
					type="button"
					variant={variant === 'minimal' ? 'ghost' : 'outline'}
					on:click={this.goPrevious}
					prop:disabled={instance.currentStep === 0}
					aria-label={labels.previousAriaLabel}
				>
					{labels.previous}
				</RuiButton>
				{showStepCounter ? (
					<span class="se-wizard-actions__counter" aria-live="polite">
						{formatStepLabel(labels.stepCounter, instance.currentStep + 1, steps.length)}
					</span>
				) : null}
				<div class="se-wizard-actions__forward">
					{last ? (
						<RuiButton
							type="submit"
							prop:disabled={instance.isSubmitting}
							aria-label={labels.submitAriaLabel}
						>
							{instance.isSubmitting ? labels.submitting : labels.submit}
						</RuiButton>
					) : (
						<RuiButton type="button" on:click={this.goNext} aria-label={labels.nextAriaLabel}>
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
