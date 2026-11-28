import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { formatStepLabel, type MinimalProgressConfig } from '@schema-engine/forms/recipes/built-in';
import type { FormMeta } from '../../lib/instance-view.js';
import type { RecipeSlotContext } from '../../recipes/types.js';
import { formInstanceContext, type FormInstanceContextValue } from '../../contexts/form-instance-context.js';
import { deriveFormSteps, deriveInitialInstance } from '../../lib/instance-view.js';

/**
 * @remarks
 * A custom progress bar rather than a landmark, a `meter` or a native `progress`: the track and
 * fill are styled in the block's CSS, which native `progress` cannot do consistently across
 * browsers. The track and fill are presentational and `aria-valuetext` announces the step, so the
 * visible percentage is hidden from assistive technology. The bar is named by the visible label so
 * the two cannot drift apart.
 */
@customElement('se-minimal-progress')
export class MinimalProgressElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: { meta?: FormMeta; slotConfig?: MinimalProgressConfig };

	@prop({ type: Object }) meta?: FormMeta;
	@prop({ type: Object }) slotConfig?: MinimalProgressConfig;

	@contextSelector({ context: formInstanceContext })
	protected instance?: FormInstanceContextValue;

	override render(): JsxRenderable {
		const meta = this.meta;
		if (!meta) return null;
		const instance = this.instance ?? deriveInitialInstance(meta);

		const config = this.slotConfig;
		if (!config) return null;
		const { labels } = config;
		const labelId = `${meta.id}-progress-label`;
		const steps = deriveFormSteps(meta, instance);
		const total = steps.length;
		const current =
			Math.max(
				steps.findIndex(({ isActive }) => isActive),
				0,
			) + 1;
		const percent = Math.round((current / total) * 100);
		return (
			<div class="se-minimal-progress">
				<div class="se-minimal-progress__labels">
					<span id={labelId}>{labels.progress}</span>
					{config.showPercentage ? (
						<span class="se-minimal-progress__percentage" aria-hidden="true">
							{percent}%
						</span>
					) : null}
				</div>
				<div
					class="se-minimal-progress__bar"
					// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- styled custom bar, see class remarks
					role="progressbar"
					aria-labelledby={labelId}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={percent}
					aria-valuetext={formatStepLabel(labels.valueText, current, total)}
				>
					<div class="se-minimal-progress__track" aria-hidden="true">
						<div class="se-minimal-progress__fill" style={{ width: `${percent}%` }} />
					</div>
				</div>
			</div>
		);
	}
}

export function MinimalProgressBlock(context?: RecipeSlotContext<MinimalProgressConfig>): JsxRenderable {
	return <MinimalProgressElement meta={context?.meta} slotConfig={context?.slotConfig} />;
}
