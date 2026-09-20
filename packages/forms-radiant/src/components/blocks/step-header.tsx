import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { RuiHeading, RuiHeadingDescription, RuiHeadingTitle } from '@ecopages/radiant-ui/heading';
import { formatStepCounter, getSlotConfig, type StepHeaderConfig } from '@schema-engine/forms/recipes';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { deriveFormMeta, deriveInitialInstance } from '@/lib/instance-view';

@customElement('se-step-header')
export class StepHeaderElement extends RadiantElement {
	@prop({ type: Object }) config?: NormalizedFormConfig;
	@prop({ type: Object }) viewConfig?: Record<string, unknown>;

	@contextSelector({ context: formInstanceContext })
	instance?: FormInstanceContextValue;

	override render(): JsxRenderable {
		const content = resolveStepHeaderContent(this.config, this.instance, this.viewConfig);
		if (!content) return null;

		const { headerConfig, title, description, counter } = content;
		const counterPlacement = headerConfig.counterPlacement ?? 'after';

		return (
			<RuiHeading as="header" size={headerConfig.size ?? 'md'} class="se-step-header">
				{counter && counterPlacement === 'before' ? <p class="se-step-header__counter">{counter}</p> : null}
				{title ? <RuiHeadingTitle as={headerConfig.titleAs ?? 'h2'}>{title}</RuiHeadingTitle> : null}
				{headerConfig.showDescription !== false && description ? (
					<RuiHeadingDescription>{description}</RuiHeadingDescription>
				) : null}
				{counter && counterPlacement === 'after' ? <p class="se-step-header__counter">{counter}</p> : null}
			</RuiHeading>
		);
	}
}

function resolveStepHeaderContent(
	config: NormalizedFormConfig | undefined,
	instance: FormInstanceContextValue | undefined,
	viewConfig: Record<string, unknown> | undefined,
) {
	if (!config) return null;
	const resolvedInstance = instance ?? deriveInitialInstance(config);
	const headerConfig = getSlotConfig<StepHeaderConfig>(viewConfig ?? {}, 'header');
	const stepIndex = config.steps[resolvedInstance.currentStep] ? resolvedInstance.currentStep : 0;
	const step = config.steps[stepIndex];
	if (!step) return null;

	const form = deriveFormMeta(config, resolvedInstance);
	const title = step.title || form.title;
	const description = step.description || form.description;
	const counter = headerConfig.showStepCounter
		? formatStepCounter(
				headerConfig.labels?.stepCounter ?? 'Step {current} of {total}',
				stepIndex + 1,
				config.steps.length,
			)
		: null;

	if (!title && !description && !counter) return null;
	return { headerConfig, title, description, counter };
}

export function StepHeaderBlock(context?: {
	config?: NormalizedFormConfig;
	viewConfig?: Record<string, unknown>;
}): JsxRenderable {
	return jsx('se-step-header', {
		'prop:config': context?.config,
		'prop:viewConfig': context?.viewConfig ?? {},
	});
}
