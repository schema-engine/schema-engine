import { onContextUpdate } from '@ecopages/radiant/context';
import { customElement, event, onEvent, RadiantElement, signal } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import type { JsxRenderable } from '@ecopages/jsx';
import type { WritableSignal } from '@ecopages/signals';
import { stepperContext } from '@/contexts/stepper-context';
import type { StepperContextValue } from '@/contexts/stepper-context';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import type { StepperNavigation } from '@/components/steppers/types';
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

type HeadlessStepperBindings = {
	view: StepperChromeView;
};

@customElement('se-headless-stepper')
export class HeadlessStepperElement extends RadiantElement<HeadlessStepperBindings> {
	@signal({ bind: true, initial: EMPTY_STEPPER_CHROME })
	view!: WritableSignal<StepperChromeView>;

	@event({ name: STEPPER_ACTION_EVENT, bubbles: true, composed: true })
	stepperAction!: EventEmitter<ResolvedStepperAction>;

	private formInstance?: FormInstanceContextValue;
	private navigation?: StepperNavigation;
	private structureKey = '';

	@onContextUpdate({ context: formInstanceContext, requestUpdate: false })
	onFormInstance(value: FormInstanceContextValue): void {
		this.formInstance = value;
	}

	@onContextUpdate({ context: stepperContext, requestUpdate: false })
	onStepperContext(value: StepperContextValue): void {
		this.navigation = value.navigation;
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
		return (
			<div class="se-headless-stepper" data-se-last-step={this.$.view.lastStepFlag}>
				<div class="se-headless-stepper__content">
					<slot />
				</div>
				<div class="se-headless-stepper__controls">
					<button
						type="button"
						class="se-headless-stepper__button"
						data-se-stepper="previous"
						disabled={this.$.view.isFirstStep}
					>
						Previous
					</button>
					<div class="se-headless-stepper__actions">
						<button
							type="submit"
							class="se-headless-stepper__button se-headless-stepper__button--primary"
							data-se-submit=""
						>
							{this.$.view.submitLabel}
						</button>
						<button
							type="button"
							class="se-headless-stepper__button se-headless-stepper__button--primary"
							data-se-stepper="next"
							data-se-next=""
							disabled={this.$.view.nextDisabled}
						>
							Next
						</button>
					</div>
				</div>
			</div>
		);
	}
}

export function HeadlessStepper({ children }: { children?: JsxRenderable }) {
	return <se-headless-stepper>{children}</se-headless-stepper>;
}
