import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { MapItems } from '@ecopages/jsx/client';
import { peek, state } from '@ecopages/signals';
import type { ViewStep } from '@schema-engine/forms/recipes';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { formatStepLabel, type StepIndicatorsConfig } from '@schema-engine/forms/recipes/built-in';
import type { FormMeta } from '../../lib/instance-view.js';
import type { RecipeSlotContext } from '../../recipes/types.js';
import { formInstanceContext, type FormInstanceContextValue } from '../../contexts/form-instance-context.js';
import { deriveFormSteps, deriveInitialInstance, deriveNavigation } from '../../lib/instance-view.js';

/**
 * One indicator, as `MapItems` receives it.
 *
 * @remarks
 * Carries everything a row reads, including the config, because the row callback runs once per item:
 * a change to any of it is a new item under the same step id, which the renderer patches in place.
 */
interface IndicatorItem {
	readonly step: ViewStep;
	readonly disabled: boolean;
	readonly config: StepIndicatorsConfig;
}

function isSameItem(a: IndicatorItem, b: IndicatorItem): boolean {
	return (
		a.disabled === b.disabled &&
		a.config === b.config &&
		(Object.keys(a.step) as (keyof ViewStep)[]).every((key) => a.step[key] === b.step[key])
	);
}

@customElement('se-step-indicators')
export class StepIndicatorsElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: { meta?: FormMeta; slotConfig?: StepIndicatorsConfig };

	@prop({ type: Object }) meta?: FormMeta;
	@prop({ type: Object }) slotConfig?: StepIndicatorsConfig;

	@contextSelector({ context: formInstanceContext })
	protected instance?: FormInstanceContextValue;

	private readonly items = state<readonly IndicatorItem[]>([]);

	/**
	 * @remarks
	 * An indicator whose state is unchanged keeps its item, so `MapItems` skips it and only the
	 * indicators that changed state are patched.
	 */
	private publishItems(next: readonly IndicatorItem[]): void {
		const previous = new Map(peek(this.items).map((item) => [item.step.id, item]));
		this.items.set(
			next.map((item) => {
				const kept = previous.get(item.step.id);
				return kept && isSameItem(kept, item) ? kept : item;
			}),
		);
	}

	private goToStep(id: string): void {
		void this.instance?.goTo(id);
	}

	override render(): JsxRenderable {
		const meta = this.meta;
		if (!meta) return null;
		const instance = this.instance ?? deriveInitialInstance(meta);
		const navigation = deriveNavigation(meta, instance);

		const indicatorsConfig = this.slotConfig;
		if (!indicatorsConfig) return null;
		const sidebar = indicatorsConfig.orientation === 'sidebar';
		this.publishItems(
			deriveFormSteps(meta, instance).map((step) => ({
				step,
				disabled: !step.isActive && !navigation.canGoToStep(step.id),
				config: indicatorsConfig,
			})),
		);
		return (
			<nav
				aria-label={indicatorsConfig.labels.regionAriaLabel}
				classes={['se-step-indicators', sidebar && 'se-step-indicators--sidebar']}
			>
				<ol class="se-step-indicators__list">
					<MapItems each={this.items}>{(item) => this.renderIndicator(item)}</MapItems>
				</ol>
			</nav>
		);
	}

	private renderIndicator({ step, disabled, config }: IndicatorItem): JsxRenderable {
		const { showStepNumbers, showStepTitles, showStepDescriptions, labels } = config;
		return (
			<li class="se-step-indicators__item" key={step.id}>
				<RuiButton
					type="button"
					variant="ghost"
					on:click={() => this.goToStep(step.id)}
					data={{
						active: step.isActive,
						completed: step.isCompleted,
					}}
					prop:disabled={disabled}
					aria-current={step.isActive ? 'step' : undefined}
				>
					{showStepNumbers ? (
						<span class="se-step-indicators__number">
							{step.isCompleted ? <span aria-hidden="true">✓</span> : step.index + 1}
						</span>
					) : null}
					{showStepTitles || (showStepDescriptions && step.description) ? (
						<span class="se-step-indicators__copy">
							{showStepTitles ? (
								<span class="se-step-indicators__title">
									{step.title || formatStepLabel(labels.untitledStep, step.index + 1, step.total)}
								</span>
							) : null}
							{showStepDescriptions && step.description ? <small>{step.description}</small> : null}
						</span>
					) : null}
					{step.isCompleted ? (
						<span class="se-visually-hidden">
							{formatStepLabel(labels.completed, step.index + 1, step.total)}
						</span>
					) : null}
				</RuiButton>
			</li>
		);
	}
}

export function StepIndicatorsBlock(context?: RecipeSlotContext<StepIndicatorsConfig>): JsxRenderable {
	return <StepIndicatorsElement meta={context?.meta} slotConfig={context?.slotConfig} />;
}
