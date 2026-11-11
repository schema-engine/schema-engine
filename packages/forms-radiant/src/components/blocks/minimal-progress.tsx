import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { formatStepCounter, type MinimalProgressConfig } from '@schema-engine/forms/recipes/built-in';
import type { FormMeta } from '@/lib/instance-view';
import type { RecipeSlotContext } from '@/recipes/types';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { deriveInitialInstance } from '@/lib/instance-view';

/**
 * @remarks
 * A custom progress bar rather than a landmark, a `meter` or a native `progress`: the track and
 * fill are styled in the block's CSS, which native `progress` cannot do consistently across
 * browsers. The track and fill are presentational and `aria-valuetext` announces the step, so the
 * visible percentage is hidden from assistive technology.
 */
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
		if (!config) return null;
		const { labels } = config;
		const current = instance.currentStep + 1;
		const percent = Math.round((current / instance.totalSteps) * 100);
		return (
			<div class="se-minimal-progress">
				<div class="se-minimal-progress__labels">
					<span>{labels.progress}</span>
					{config.showPercentage ? <span aria-hidden="true">{percent}%</span> : null}
				</div>
				<div
					class="se-minimal-progress__bar"
					// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- styled custom bar, see class remarks
					role="progressbar"
					aria-label={labels.regionAriaLabel}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={percent}
					aria-valuetext={formatStepCounter(labels.valueText, current, instance.totalSteps)}
				>
					<div class="se-minimal-progress__track" aria-hidden="true">
						<div class="se-minimal-progress__fill" style={{ width: `${percent}%` }} />
					</div>
				</div>
			</div>
		);
	}
}

export function MinimalProgressBlock(context?: RecipeSlotContext): JsxRenderable {
	return jsx('se-minimal-progress', {
		meta: context?.meta,
		slotConfig: context?.slotConfig,
	});
}
