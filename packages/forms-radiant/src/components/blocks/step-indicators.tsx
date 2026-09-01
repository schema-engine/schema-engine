import '@ecopages/radiant-ui/button/styles.css';
import { contextSelector } from '@ecopages/radiant/context';
import { customElement, onEvent, RadiantElement } from '@ecopages/radiant';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { getSlotConfig, type StepIndicatorsConfig, type ViewModel } from '@schema-engine/forms/recipes';
import { viewContext } from '@/contexts/view-context';

@customElement('se-step-indicators')
export class StepIndicatorsElement extends RadiantElement {
	@contextSelector({ context: viewContext }) view!: ViewModel;

	@onEvent({ type: 'click', selector: '[data-se-view-step]' })
	onStepClick(event: Event): void {
		const target = (event.target as Element | null)?.closest<HTMLElement>('[data-se-view-step]');
		const index = Number(target?.dataset.seViewStep);
		if (Number.isInteger(index)) this.view.navigation.goToStep(index);
	}

	override render(): JsxRenderable {
		if (!this.view) return null;
		const config = getSlotConfig<StepIndicatorsConfig>(this.view.viewConfig, 'progress');
		const showNumbers = config.showStepNumbers ?? true;
		const showTitles = config.showStepTitles ?? true;
		const showDescriptions = config.showStepDescriptions ?? false;
		const sidebar = config.orientation === 'sidebar';
		return (
			<nav
				aria-label={config.labels?.regionAriaLabel ?? 'Form progress'}
				class={sidebar ? 'se-step-indicators se-step-indicators--sidebar' : 'se-step-indicators'}
			>
				<ol class="se-step-indicators__list">
					{this.view.steps.map((step) => {
						const disabled = !step.isVisited && step.index > this.view.activeStep.index;
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
									{showTitles ? <span>{step.title || `Step ${step.index + 1}`}</span> : null}
									{showDescriptions && step.description ? <small>{step.description}</small> : null}
								</RuiButton>
							</li>
						);
					})}
				</ol>
			</nav>
		);
	}
}

export function StepIndicatorsBlock(): JsxRenderable {
	return <se-step-indicators />;
}
