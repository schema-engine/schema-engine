import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { RuiHeading, RuiHeadingDescription, RuiHeadingTitle } from '@ecopages/radiant-ui/heading';
import { formatStepCounter, getSlotConfig, type StepHeaderConfig } from '@schema-engine/forms/recipes';
import type { FormMeta } from '@/lib/instance-view';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { deriveInitialInstance } from '@/lib/instance-view';

@customElement('se-step-header')
export class StepHeaderElement extends RadiantElement {
	@prop({ type: Object }) meta?: FormMeta;
	@prop({ type: Object }) viewConfig?: Record<string, unknown>;

	@contextSelector({ context: formInstanceContext })
	instance?: FormInstanceContextValue;

	override render(): JsxRenderable {
		const meta = this.meta;
		if (!meta) return null;
		const instance = this.instance ?? deriveInitialInstance(meta);

		const headerConfig = getSlotConfig<StepHeaderConfig>(this.viewConfig ?? {}, 'header');
		const stepIndex = meta.steps[instance.currentStep] ? instance.currentStep : 0;
		const step = meta.steps[stepIndex];
		if (!step) return null;
		const total = meta.steps.length;

		const title = step.title || meta.title;
		const description = step.description || meta.description;
		const showCounter = headerConfig.showStepCounter === true;
		const counter = showCounter
			? formatStepCounter(headerConfig.labels?.stepCounter ?? 'Step {current} of {total}', stepIndex + 1, total)
			: null;

		if (!title && !description && !counter) return null;

		return (
			<RuiHeading as="header" size={headerConfig.size ?? 'md'} class="se-step-header">
				{counter && (headerConfig.counterPlacement ?? 'after') === 'before' ? (
					<p class="se-step-header__counter">{counter}</p>
				) : null}
				{title ? <RuiHeadingTitle as={headerConfig.titleAs ?? 'h2'}>{title}</RuiHeadingTitle> : null}
				{headerConfig.showDescription !== false && description ? (
					<RuiHeadingDescription>{description}</RuiHeadingDescription>
				) : null}
				{counter && (headerConfig.counterPlacement ?? 'after') === 'after' ? (
					<p class="se-step-header__counter">{counter}</p>
				) : null}
			</RuiHeading>
		);
	}
}

export function StepHeaderBlock(context?: { meta?: FormMeta; viewConfig?: Record<string, unknown> }): JsxRenderable {
	return jsx('se-step-header', {
		meta: context?.meta,
		viewConfig: context?.viewConfig ?? {},
	});
}
