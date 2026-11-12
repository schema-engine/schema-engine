import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { getSlotConfig } from '@schema-engine/forms/recipes';
import { type MinimalProgressConfig } from '@schema-engine/forms/recipes/built-in';
import type { FormMeta } from '@/lib/instance-view';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { deriveInitialInstance } from '@/lib/instance-view';

@customElement('se-minimal-progress')
export class MinimalProgressElement extends RadiantElement {
	@prop({ type: Object }) meta?: FormMeta;
	@prop({ type: Object }) viewConfig?: Record<string, unknown>;

	@contextSelector({ context: formInstanceContext })
	instance?: FormInstanceContextValue;

	override render(): JsxRenderable {
		const meta = this.meta;
		if (!meta) return null;
		const instance = this.instance ?? deriveInitialInstance(meta);

		const progressConfig = getSlotConfig<MinimalProgressConfig>(this.viewConfig ?? {}, 'progress');
		if (progressConfig.showPercentage === false) return null;
		const percent = Math.round(((instance.currentStep + 1) / instance.totalSteps) * 100);
		return (
			<nav aria-label={progressConfig.labels?.regionAriaLabel ?? 'Form progress'} class="se-minimal-progress">
				<div class="se-minimal-progress__labels">
					<span>{progressConfig.labels?.progress ?? 'Progress'}</span>
					<span>{percent}%</span>
				</div>
				<div class="se-minimal-progress__track" aria-hidden="true">
					<div class="se-minimal-progress__fill" style={{ width: `${percent}%` }} />
				</div>
			</nav>
		);
	}
}

export function MinimalProgressBlock(context?: {
	meta?: FormMeta;
	viewConfig?: Record<string, unknown>;
}): JsxRenderable {
	return jsx('se-minimal-progress', {
		meta: context?.meta,
		viewConfig: context?.viewConfig ?? {},
	});
}
