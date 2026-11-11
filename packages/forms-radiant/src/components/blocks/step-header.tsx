import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { RuiHeading, RuiHeadingDescription, RuiHeadingTitle } from '@ecopages/radiant-ui/heading';
import { formatStepCounter, type StepHeaderConfig } from '@schema-engine/forms/recipes/built-in';
import type { FormMeta } from '@/lib/instance-view';
import type { RecipeSlotContext } from '@/recipes/types';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { deriveInitialInstance } from '@/lib/instance-view';

@customElement('se-step-header')
export class StepHeaderElement extends RadiantElement {
	@prop({ type: Object }) meta?: FormMeta;
	@prop({ type: Object }) slotConfig?: StepHeaderConfig;

	@contextSelector({ context: formInstanceContext })
	instance?: FormInstanceContextValue;

	override render(): JsxRenderable {
		const meta = this.meta;
		if (!meta) return null;
		const instance = this.instance ?? deriveInitialInstance(meta);

		const headerConfig = this.slotConfig;
		if (!headerConfig) return null;
		const stepIndex = meta.steps[instance.currentStep] ? instance.currentStep : 0;
		const step = meta.steps[stepIndex];
		if (!step) return null;
		const total = meta.steps.length;

		const title = step.title || (headerConfig.fallbackToFormTitle ? meta.title : undefined);
		const description = step.description || meta.description;
		const showCounter = headerConfig.showStepCounter;
		const counter = showCounter ? formatStepCounter(headerConfig.labels.stepCounter, stepIndex + 1, total) : null;

		if (!title && !description && !counter) return null;

		return (
			<RuiHeading
				as="header"
				size={headerConfig.size}
				align={headerConfig.align}
				class={headerConfig.inheritColor ? 'se-step-header se-step-header--inherit-color' : 'se-step-header'}
			>
				{counter && headerConfig.counterPlacement === 'before' ? (
					<p class="se-step-header__counter">{counter}</p>
				) : null}
				{title ? <RuiHeadingTitle as={headerConfig.titleAs}>{title}</RuiHeadingTitle> : null}
				{headerConfig.showDescription && description ? (
					<RuiHeadingDescription>{description}</RuiHeadingDescription>
				) : null}
				{counter && headerConfig.counterPlacement === 'after' ? (
					<p class="se-step-header__counter">{counter}</p>
				) : null}
			</RuiHeading>
		);
	}
}

export function StepHeaderBlock(context?: RecipeSlotContext): JsxRenderable {
	return jsx('se-step-header', {
		meta: context?.meta,
		slotConfig: context?.slotConfig,
	});
}
