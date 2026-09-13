import { contextSelector } from '@ecopages/radiant/context';
import { customElement, onEvent, prop, RadiantElement } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { DEFAULT_WIZARD_ACTION_LABELS, getSlotConfig, type WizardActionsConfig } from '@schema-engine/forms/recipes';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { deriveFormSteps, deriveInitialInstance } from '@/lib/instance-view';

@customElement('se-wizard-actions')
export class WizardActionsElement extends RadiantElement {
	@prop({ type: Object }) config?: NormalizedFormConfig;
	@prop({ type: Object }) viewConfig?: Record<string, unknown>;

	@contextSelector({ context: formInstanceContext })
	instance?: FormInstanceContextValue;

	@onEvent({ type: 'click', selector: '[data-se-view-previous]' })
	onPrevious(): void {
		this.instance?.goToPreviousStep();
	}

	@onEvent({ type: 'click', selector: '[data-se-view-next]' })
	onNext(): void {
		this.instance?.goToNextStep();
	}

	override render(): JsxRenderable {
		const config = this.config;
		if (!config) return null;
		const instance = this.instance ?? deriveInitialInstance(config);

		const actionsConfig = getSlotConfig<WizardActionsConfig>(this.viewConfig ?? {}, 'actions');
		const labels = { ...DEFAULT_WIZARD_ACTION_LABELS, ...actionsConfig.labels };
		const appearance = actionsConfig.appearance ?? 'default';
		const showStepCounter = actionsConfig.showStepCounter ?? appearance === 'default';
		const last = instance.currentStep >= instance.totalSteps - 1;
		const steps = deriveFormSteps(config, instance);
		const form = { isSubmitting: instance.isSubmitting };
		return (
			<div
				class={appearance === 'minimal' ? 'se-wizard-actions se-wizard-actions--minimal' : 'se-wizard-actions'}
			>
				<RuiButton
					type="button"
					variant={appearance === 'minimal' ? 'ghost' : 'outline'}
					data={{ seViewPrevious: true }}
					prop:disabled={instance.currentStep === 0}
					aria-label={labels.previousAriaLabel}
				>
					{labels.previous}
				</RuiButton>
				{showStepCounter ? (
					<span class="se-wizard-actions__counter">
						Step {instance.currentStep + 1} of {steps.length}
					</span>
				) : null}
				<div class="se-wizard-actions__forward">
					<RuiButton type="submit" hidden={!last} aria-label={labels.submitAriaLabel}>
						{form.isSubmitting ? labels.submitting : labels.submit}
					</RuiButton>
					<RuiButton
						type="button"
						data={{ seViewNext: true }}
						hidden={last}
						prop:disabled={instance.currentStep >= instance.totalSteps - 1}
						aria-label={labels.nextAriaLabel}
					>
						{labels.next}
					</RuiButton>
				</div>
			</div>
		);
	}
}

export function WizardActionsBlock(context?: {
	config?: NormalizedFormConfig;
	viewConfig?: Record<string, unknown>;
}): JsxRenderable {
	return jsx('se-wizard-actions', {
		'prop:config': context?.config,
		'prop:viewConfig': context?.viewConfig ?? {},
	});
}
