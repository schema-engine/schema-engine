import '@ecopages/radiant-ui/heading/styles.css';
import { contextSelector } from '@ecopages/radiant/context';
import { customElement, RadiantElement } from '@ecopages/radiant';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiHeading, RuiHeadingDescription, RuiHeadingTitle } from '@ecopages/radiant-ui/heading';
import { formatStepCounter, getSlotConfig, type StepHeaderConfig, type ViewModel } from '@schema-engine/forms/recipes';
import { viewContext } from '@/contexts/view-context';

@customElement('se-step-header')
export class StepHeaderElement extends RadiantElement {
	@contextSelector({ context: viewContext }) view!: ViewModel;

	override render(): JsxRenderable {
		if (!this.view) return null;
		const config = getSlotConfig<StepHeaderConfig>(this.view.viewConfig, 'header');
		const step = this.view.activeStep;
		const title = step.title || this.view.form.title;
		const description = step.description || this.view.form.description;
		const showCounter = config.showStepCounter === true;
		const counter = showCounter
			? formatStepCounter(config.labels?.stepCounter ?? 'Step {current} of {total}', step.index + 1, step.total)
			: null;

		if (!title && !description && !counter) return null;

		return (
			<RuiHeading as="header" size={config.size ?? 'md'} class="se-step-header">
				{counter && (config.counterPlacement ?? 'after') === 'before' ? (
					<p class="se-step-header__counter">{counter}</p>
				) : null}
				{title ? <RuiHeadingTitle as={config.titleAs ?? 'h2'}>{title}</RuiHeadingTitle> : null}
				{config.showDescription !== false && description ? (
					<RuiHeadingDescription>{description}</RuiHeadingDescription>
				) : null}
				{counter && (config.counterPlacement ?? 'after') === 'after' ? (
					<p class="se-step-header__counter">{counter}</p>
				) : null}
			</RuiHeading>
		);
	}
}

export function StepHeaderBlock(): JsxRenderable {
	return <se-step-header />;
}
