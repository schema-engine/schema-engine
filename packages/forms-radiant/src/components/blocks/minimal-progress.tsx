import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { type MinimalProgressConfig } from '@schema-engine/forms/recipes/built-in';
import type { FormMeta } from '@/lib/instance-view';
import type { RecipeSlotContext } from '@/recipes/types';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { deriveInitialInstance } from '@/lib/instance-view';

@customElement('se-minimal-progress')
export class MinimalProgressElement extends RadiantElement {
	@prop({ type: Object }) meta?: FormMeta;
	@prop({ type: Object }) slotConfig?: MinimalProgressConfig;

	@contextSelector({ context: formInstanceContext })
	instance?: FormInstanceContextValue;

	override render(): JsxRenderable {
		const meta = this.meta;
		if (!meta) return null;
		const instance = this.instance ?? deriveInitialInstance(meta);

		const config = this.slotConfig;
		if (!config?.showPercentage) return null;
		const { labels } = config;
		const percent = Math.round(((instance.currentStep + 1) / instance.totalSteps) * 100);
		return (
			<nav aria-label={labels.regionAriaLabel} class="se-minimal-progress">
				<div class="se-minimal-progress__labels">
					<span>{labels.progress}</span>
					<span>{percent}%</span>
				</div>
				<div class="se-minimal-progress__track" aria-hidden="true">
					<div class="se-minimal-progress__fill" style={{ width: `${percent}%` }} />
				</div>
			</nav>
		);
	}
}

export function MinimalProgressBlock(context?: RecipeSlotContext): JsxRenderable {
	return jsx('se-minimal-progress', {
		meta: context?.meta,
		slotConfig: context?.slotConfig,
	});
}
