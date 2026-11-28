import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { RuiHeading, RuiHeadingDescription, RuiHeadingTitle } from '@ecopages/radiant-ui/heading';
import { formatStepLabel, type StepHeaderConfig } from '@schema-engine/forms/recipes/built-in';
import type { FormMeta } from '@/lib/instance-view.js';
import type { RecipeSlotContext } from '../../recipes/types.js';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context.js';
import { deriveFormSteps, deriveInitialInstance } from '@/lib/instance-view.js';

@customElement('se-step-header')
export class StepHeaderElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: { meta?: FormMeta; slotConfig?: StepHeaderConfig };

	@prop({ type: Object }) meta?: FormMeta;
	@prop({ type: Object }) slotConfig?: StepHeaderConfig;

	@contextSelector({ context: formInstanceContext })
	protected instance?: FormInstanceContextValue;

	override render(): JsxRenderable {
		const meta = this.meta;
		if (!meta) return null;
		const instance = this.instance ?? deriveInitialInstance(meta);

		const headerConfig = this.slotConfig;
		if (!headerConfig) return null;
		const steps = deriveFormSteps(meta, instance);
		const stepIndex = Math.max(
			steps.findIndex(({ isActive }) => isActive),
			0,
		);
		const step = meta.steps.find(({ id }) => id === instance.current) ?? meta.steps[0];
		if (!step) return null;
		const total = steps.length;

		const title = step.title || (headerConfig.fallbackToFormTitle ? meta.title : undefined);
		const description = step.description || meta.description;
		const showCounter = headerConfig.showStepCounter;
		const counter = showCounter ? formatStepLabel(headerConfig.labels.stepCounter, stepIndex + 1, total) : null;

		if (!title && !description && !counter) return null;

		return (
			<RuiHeading
				as="header"
				size={headerConfig.size}
				data={{ align: headerConfig.align }}
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

export function StepHeaderBlock(context?: RecipeSlotContext<StepHeaderConfig>): JsxRenderable {
	return <StepHeaderElement meta={context?.meta} slotConfig={context?.slotConfig} />;
}
