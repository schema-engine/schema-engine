import { contextSelector } from '@ecopages/radiant/context';
import { customElement, onEvent, prop, RadiantElement } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { getSlotConfig, type StepIndicatorsConfig } from '@schema-engine/forms/recipes';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { deriveFormSteps, deriveInitialInstance } from '@/lib/instance-view';

@customElement('se-step-indicators')
export class StepIndicatorsElement extends RadiantElement {
	@prop({ type: Object }) config?: NormalizedFormConfig;
	@prop({ type: Object }) viewConfig?: Record<string, unknown>;

	@contextSelector({ context: formInstanceContext })
	instance?: FormInstanceContextValue;

	@onEvent({ type: 'click', selector: '[data-se-view-step]' })
	onStepClick(event: Event): void {
		const target = (event.target as Element | null)?.closest<HTMLElement>('[data-se-view-step]');
		const index = Number(target?.dataset.seViewStep);
		if (Number.isInteger(index)) this.instance?.goToStep(index);
	}

	override render(): JsxRenderable {
		const config = this.config;
		if (!config) return null;
		const instance = this.instance ?? deriveInitialInstance(config);

		const indicatorsConfig = getSlotConfig<StepIndicatorsConfig>(this.viewConfig ?? {}, 'progress');
		const showNumbers = indicatorsConfig.showStepNumbers ?? true;
		const showTitles = indicatorsConfig.showStepTitles ?? true;
		const showDescriptions = indicatorsConfig.showStepDescriptions ?? false;
		const sidebar = indicatorsConfig.orientation === 'sidebar';
		const steps = deriveFormSteps(config, instance);
		return (
			<nav
				aria-label={indicatorsConfig.labels?.regionAriaLabel ?? 'Form progress'}
				classes={['se-step-indicators', sidebar && 'se-step-indicators--sidebar']}
			>
				<ol class="se-step-indicators__list">
					{steps.map((step) => {
						const disabled = !step.isVisited && step.index > instance.currentStep;
						return (
							<li class="se-step-indicators__item">
								<RuiButton
									type="button"
									variant="ghost"
									data={{
										seViewStep: step.index,
										active: step.isActive,
										completed: step.isCompleted,
									}}
									prop:disabled={disabled}
								>
									{showNumbers ? (
										<span class="se-step-indicators__number">
											{step.isCompleted ? '✓' : step.index + 1}
										</span>
									) : null}
									{showTitles || (showDescriptions && step.description) ? (
										<span class="se-step-indicators__copy">
											{showTitles ? (
												<span class="se-step-indicators__title">
													{step.title || `Step ${step.index + 1}`}
												</span>
											) : null}
											{showDescriptions && step.description ? (
												<small>{step.description}</small>
											) : null}
										</span>
									) : null}
								</RuiButton>
							</li>
						);
					})}
				</ol>
			</nav>
		);
	}
}

export function StepIndicatorsBlock(context?: {
	config?: NormalizedFormConfig;
	viewConfig?: Record<string, unknown>;
}): JsxRenderable {
	return jsx('se-step-indicators', {
		config: context?.config,
		viewConfig: context?.viewConfig ?? {},
	});
}
