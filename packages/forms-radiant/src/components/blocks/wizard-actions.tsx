import '@ecopages/radiant-ui/button/styles.css';
import { contextSelector } from '@ecopages/radiant/context';
import { customElement, onEvent, RadiantElement } from '@ecopages/radiant';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import {
	DEFAULT_WIZARD_ACTION_LABELS,
	getSlotConfig,
	type ViewModel,
	type WizardActionsConfig,
} from '@schema-engine/forms/recipes';
import { viewContext } from '@/contexts/view-context';

@customElement('se-wizard-actions')
export class WizardActionsElement extends RadiantElement {
	@contextSelector({ context: viewContext }) view!: ViewModel;

	@onEvent({ type: 'click', selector: '[data-se-view-previous]' })
	onPrevious(): void {
		this.view.navigation.goToPreviousStep();
	}

	@onEvent({ type: 'click', selector: '[data-se-view-next]' })
	onNext(): void {
		this.view.navigation.goToNextStep();
	}

	override render(): JsxRenderable {
		if (!this.view) return null;
		const config = getSlotConfig<WizardActionsConfig>(this.view.viewConfig, 'actions');
		const labels = { ...DEFAULT_WIZARD_ACTION_LABELS, ...config.labels };
		const appearance = config.appearance ?? 'default';
		const showStepCounter = config.showStepCounter ?? appearance === 'default';
		const last = this.view.navigation.isLastStep;
		return (
			<div
				class={appearance === 'minimal' ? 'se-wizard-actions se-wizard-actions--minimal' : 'se-wizard-actions'}
			>
				<RuiButton
					type="button"
					variant={appearance === 'minimal' ? 'ghost' : 'outline'}
					data={{ seViewPrevious: true }}
					prop:disabled={this.view.navigation.isFirstStep}
					aria-label={labels.previousAriaLabel}
				>
					{labels.previous}
				</RuiButton>
				{showStepCounter ? (
					<span class="se-wizard-actions__counter">
						Step {this.view.activeStep.index + 1} of {this.view.steps.length}
					</span>
				) : null}
				<div class="se-wizard-actions__forward">
					<RuiButton type="submit" hidden={!last} aria-label={labels.submitAriaLabel}>
						{this.view.form.isSubmitting ? labels.submitting : labels.submit}
					</RuiButton>
					<RuiButton
						type="button"
						data={{ seViewNext: true }}
						hidden={last}
						prop:disabled={!this.view.navigation.canGoNext}
						aria-label={labels.nextAriaLabel}
					>
						{labels.next}
					</RuiButton>
				</div>
			</div>
		);
	}
}

export function WizardActionsBlock(): JsxRenderable {
	return <se-wizard-actions />;
}
