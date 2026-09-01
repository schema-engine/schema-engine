import { contextSelector } from '@ecopages/radiant/context';
import { customElement, RadiantElement } from '@ecopages/radiant';
import type { JsxRenderable } from '@ecopages/jsx';
import { getSlotConfig, type MinimalProgressConfig, type ViewModel } from '@schema-engine/forms/recipes';
import { viewContext } from '@/contexts/view-context';

@customElement('se-minimal-progress')
export class MinimalProgressElement extends RadiantElement {
	@contextSelector({ context: viewContext }) view!: ViewModel;

	override render(): JsxRenderable {
		if (!this.view) return null;
		const config = getSlotConfig<MinimalProgressConfig>(this.view.viewConfig, 'progress');
		if (config.showPercentage === false) return null;
		const percent = Math.round(((this.view.activeStep.index + 1) / this.view.steps.length) * 100);
		return (
			<nav aria-label={config.labels?.regionAriaLabel ?? 'Form progress'} class="se-minimal-progress">
				<div class="se-minimal-progress__labels">
					<span>{config.labels?.progress ?? 'Progress'}</span>
					<span>{percent}%</span>
				</div>
				<div class="se-minimal-progress__track" aria-hidden="true">
					<div class="se-minimal-progress__fill" style={{ width: `${percent}%` }} />
				</div>
			</nav>
		);
	}
}

export function MinimalProgressBlock(): JsxRenderable {
	return <se-minimal-progress />;
}
