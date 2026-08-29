import './minimalist-stepper.css';
import '@ecopages/radiant-ui/button/styles.css';
import { onContextUpdate } from '@ecopages/radiant/context';
import { customElement, event, onEvent, prop, RadiantElement, signal } from '@ecopages/radiant';
import { RuiButton } from '@ecopages/radiant-ui/button';
import type { JsxRenderable } from '@ecopages/jsx';
import type { WritableSignal } from '@ecopages/signals';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { stepperContext } from '@/contexts/stepper-context';
import type { StepperContextValue } from '@/contexts/stepper-context';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import type { MinimalistStepperConfig } from './minimalist-stepper.types';
import type { StepperNavigation } from './types';
import {
	routeStepperClick,
	STEPPER_ACTION_ATTR,
	STEPPER_ACTION_EVENT,
	type ResolvedStepperAction,
} from '@/lib/stepper-actions';
import {
	createStepperChromeView,
	EMPTY_STEPPER_CHROME,
	stepperStructureKey,
	syncStepperChromeView,
	type StepperChromeView,
} from '@/lib/stepper-chrome';

type MinimalistStepperBindings = {
	view: StepperChromeView;
};

@customElement('se-minimalist-stepper')
export class MinimalistStepperElement extends RadiantElement<MinimalistStepperBindings> {
	@prop({ type: String }) stepperClass = '';

	@signal({ bind: true, initial: EMPTY_STEPPER_CHROME })
	view!: WritableSignal<StepperChromeView>;

	@event({ name: STEPPER_ACTION_EVENT, bubbles: true, composed: true })
	stepperAction!: EventEmitter<ResolvedStepperAction>;

	private readonly progressFillStyle = this.$.view.map((view) => ({
		transform: `scaleX(${Math.min(Math.max(view.progressValue, 0), 100) / 100})`,
		transformOrigin: 'left center',
	}));

	private formInstance?: FormInstanceContextValue;
	private navigation?: StepperNavigation;
	private config: MinimalistStepperConfig = {} as MinimalistStepperConfig;
	private structureKey = '';

	@onContextUpdate({ context: formInstanceContext, requestUpdate: false })
	onFormInstance(value: FormInstanceContextValue): void {
		this.formInstance = value;
	}

	@onContextUpdate({ context: stepperContext, requestUpdate: false })
	onStepperContext(value: StepperContextValue): void {
		this.navigation = value.navigation;
		this.config = (value.config ?? {}) as MinimalistStepperConfig;
		syncStepperChromeView(this.view, createStepperChromeView(value));

		const nextKey = stepperStructureKey(value.steps ?? [], value.config as Record<string, unknown> | undefined);
		if (nextKey === this.structureKey) {
			return;
		}

		this.structureKey = nextKey;
		this.requestUpdate();
	}

	@onEvent({ type: 'click', selector: `[${STEPPER_ACTION_ATTR}]` })
	onStepperActionClick(clickEvent: Event): void {
		routeStepperClick(clickEvent, this.formInstance, this.navigation, (action) => this.stepperAction.emit(action));
	}

	override render(): JsxRenderable {
		const showProgress = this.config.showProgress ?? true;

		return (
			<div
				class={`minimalist-stepper ${this.stepperClass}`.trim()}
				data-se-current-step={this.$.view.currentStepIndex}
				data-se-last-step={this.$.view.lastStepFlag}
			>
				{showProgress ? (
					<div class="minimalist-stepper__progress">
						<div class="minimalist-stepper__progress-labels">
							<span>Progress</span>
							<span>{this.$.view.progressLabel}</span>
						</div>
						<div class="minimalist-stepper__progress-bar" aria-hidden="true">
							<div class="minimalist-stepper__progress-fill" style={this.progressFillStyle} />
						</div>
					</div>
				) : null}
				<header class="minimalist-stepper__header">
					<p class="minimalist-stepper__counter" data-se-step-chip="">
						{this.$.view.stepChip}
					</p>
					<h2 class="minimalist-stepper__title">{this.$.view.currentTitle}</h2>
					<p class="minimalist-stepper__description" hidden={this.$.view.descriptionHidden}>
						{this.$.view.currentDescription}
					</p>
				</header>
				<div class="minimalist-stepper__content">
					<slot />
				</div>
				<div class="minimalist-stepper__navigation">
					<RuiButton
						type="button"
						variant="ghost"
						data-se-stepper="previous"
						prop:disabled={this.$.view.isFirstStep}
					>
						Previous
					</RuiButton>
					<RuiButton type="submit" data-se-submit="">
						{this.$.view.submitLabel}
					</RuiButton>
					<RuiButton
						type="button"
						data-se-stepper="next"
						data-se-next=""
						prop:disabled={this.$.view.nextDisabled}
					>
						Next
					</RuiButton>
				</div>
			</div>
		);
	}
}

export function MinimalistStepperComposed({ children }: { children?: JsxRenderable }) {
	return <se-minimalist-stepper>{children}</se-minimalist-stepper>;
}
