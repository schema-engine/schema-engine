import { contextSelector } from '@ecopages/radiant/context';
import { prop, RadiantElement } from '@ecopages/radiant';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { formatStepLabel, type StepIndicatorsConfig } from '@schema-engine/forms/recipes/built-in';
import type { FormMeta } from '@/lib/instance-view';
import type { RecipeSlotContext } from '@/recipes/types';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { deriveFormSteps, deriveInitialInstance } from '@/lib/instance-view';
import { formElement } from '@/lib/define-element';

@formElement('se-step-indicators')
export class StepIndicatorsElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: { meta?: FormMeta; slotConfig?: StepIndicatorsConfig };

	@prop({ type: Object }) meta?: FormMeta;
	@prop({ type: Object }) slotConfig?: StepIndicatorsConfig;

	@contextSelector({ context: formInstanceContext })
	protected instance?: FormInstanceContextValue;

	private goToStep(index: number): void {
		void this.instance?.goToStep(index);
	}

	override render(): JsxRenderable {
		const meta = this.meta;
		if (!meta) return null;
		const instance = this.instance ?? deriveInitialInstance(meta);

		const indicatorsConfig = this.slotConfig;
		if (!indicatorsConfig) return null;
		const showNumbers = indicatorsConfig.showStepNumbers;
		const showTitles = indicatorsConfig.showStepTitles;
		const showDescriptions = indicatorsConfig.showStepDescriptions;
		const sidebar = indicatorsConfig.orientation === 'sidebar';
		const steps = deriveFormSteps(meta, instance);
		return (
			<nav
				aria-label={indicatorsConfig.labels.regionAriaLabel}
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
									on:click={() => this.goToStep(step.index)}
									data={{
										active: step.isActive,
										completed: step.isCompleted,
									}}
									prop:disabled={disabled}
									aria-current={step.isActive ? 'step' : undefined}
								>
									{showNumbers ? (
										<span class="se-step-indicators__number">
											{step.isCompleted ? <span aria-hidden="true">✓</span> : step.index + 1}
										</span>
									) : null}
									{showTitles || (showDescriptions && step.description) ? (
										<span class="se-step-indicators__copy">
											{showTitles ? (
												<span class="se-step-indicators__title">
													{step.title ||
														formatStepLabel(
															indicatorsConfig.labels.untitledStep,
															step.index + 1,
															steps.length,
														)}
												</span>
											) : null}
											{showDescriptions && step.description ? (
												<small>{step.description}</small>
											) : null}
										</span>
									) : null}
									{step.isCompleted ? (
										<span class="se-visually-hidden">
											{formatStepLabel(
												indicatorsConfig.labels.completed,
												step.index + 1,
												steps.length,
											)}
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

export function StepIndicatorsBlock(context?: RecipeSlotContext): JsxRenderable {
	return (
		<StepIndicatorsElement
			meta={context?.meta}
			slotConfig={context?.slotConfig as StepIndicatorsConfig | undefined}
		/>
	);
}
