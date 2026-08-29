import './default-stepper.css';
import './minimalist-stepper.css';
import '@ecopages/radiant-ui/badge/styles.css';
import '@ecopages/radiant-ui/button/styles.css';
import '@ecopages/radiant-ui/heading/styles.css';
import '@ecopages/radiant-ui/headline/styles.css';
import { onContextUpdate } from '@ecopages/radiant/context';
import { customElement, event, onEvent, prop, RadiantElement, signal } from '@ecopages/radiant';
import { type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { WritableSignal } from '@ecopages/signals';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { RuiBadge } from '@ecopages/radiant-ui/badge';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiHeading, RuiHeadingDescription, RuiHeadingTitle } from '@ecopages/radiant-ui/heading';
import { stepperContext } from '@/contexts/stepper-context';
import type { StepperContextValue } from '@/contexts/stepper-context';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import type { DefaultStepperConfig } from './default-stepper.types';
import type { StepData, StepperNavigation } from './types';
import {
	routeStepperClick,
	STEPPER_ACTION_ATTR,
	STEPPER_ACTION_EVENT,
	type ResolvedStepperAction,
} from '@/lib/stepper-actions';
import {
	createStepButtonBindings,
	createStepperChromeView,
	EMPTY_STEPPER_CHROME,
	stepperStructureKey,
	syncStepperChromeView,
	type StepButtonBinding,
	type StepperChromeView,
} from '@/lib/stepper-chrome';

function stepperClassName(...parts: Array<string | false | undefined>) {
	return parts.filter(Boolean).join(' ');
}

function CheckIcon() {
	return (
		<svg
			class="default-stepper__check-icon"
			viewBox="0 0 24 24"
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M20 6 9 17l-5-5" />
		</svg>
	);
}

type DefaultStepperBindings = {
	view: StepperChromeView;
};

@customElement('se-default-stepper')
export class DefaultStepperElement extends RadiantElement<DefaultStepperBindings> {
	@prop({ type: String }) stepperClass = '';

	@signal({ bind: true, initial: EMPTY_STEPPER_CHROME })
	view!: WritableSignal<StepperChromeView>;

	@event({ name: STEPPER_ACTION_EVENT, bubbles: true, composed: true })
	stepperAction!: EventEmitter<ResolvedStepperAction>;

	private formInstance?: FormInstanceContextValue;
	private navigation?: StepperNavigation;
	private steps: StepData[] = [];
	private config: DefaultStepperConfig = {} as DefaultStepperConfig;
	private structureKey = '';
	private stepBindings: StepButtonBinding[] = [];

	@onContextUpdate({ context: formInstanceContext, requestUpdate: false })
	onFormInstance(value: FormInstanceContextValue): void {
		this.formInstance = value;
	}

	@onContextUpdate({ context: stepperContext, requestUpdate: false })
	onStepperContext(value: StepperContextValue): void {
		this.navigation = value.navigation;
		this.config = (value.config ?? {}) as DefaultStepperConfig;
		syncStepperChromeView(this.view, createStepperChromeView(value));

		const nextKey = stepperStructureKey(value.steps ?? [], value.config as Record<string, unknown> | undefined);
		if (nextKey === this.structureKey) {
			return;
		}

		this.structureKey = nextKey;
		this.steps = value.steps ?? [];
		this.stepBindings = createStepButtonBindings(this.$.view, this.steps.length);
		this.requestUpdate();
	}

	@onEvent({ type: 'click', selector: `[${STEPPER_ACTION_ATTR}]` })
	onStepperActionClick(clickEvent: Event): void {
		routeStepperClick(clickEvent, this.formInstance, this.navigation, (action) => this.stepperAction.emit(action));
	}

	override render(): JsxRenderable {
		const steps = this.steps;
		const config = this.config;
		const orientation = config.orientation ?? 'horizontal';
		const showStepNumbers = config.showStepNumbers ?? true;
		const showStepTitles = config.showStepTitles ?? true;
		const showStepDescriptions = config.showStepDescriptions ?? false;
		const isSidebar = orientation === 'sidebar';

		const indicators = (
			<nav aria-label="Form progress" class="default-stepper__progress">
				<ol class="default-stepper__steps">
					{steps.map((step, index) => {
						const chrome = this.stepBindings[index];
						const title = step.title || `Step ${index + 1}`;
						return (
							<li key={step.id} class="default-stepper__step-item">
								<button
									type="button"
									class="default-stepper__step-button"
									data-se-stepper="goto"
									data-se-step-index={String(index)}
									data-se-step-state={chrome?.state}
									disabled={chrome?.disabled}
									aria-current={chrome?.ariaCurrent}
									aria-label={title}
								>
									{showStepNumbers ? (
										<span class="default-stepper__indicator">
											<CheckIcon />
											<span class="default-stepper__indicator-index">{index + 1}</span>
										</span>
									) : null}
									{showStepTitles || (showStepDescriptions && step.description) ? (
										<span class="default-stepper__step-copy">
											{showStepTitles ? (
												<span class="default-stepper__step-title">{chrome?.title}</span>
											) : null}
											{showStepDescriptions && step.description ? (
												<span class="default-stepper__step-description">
													{step.description}
												</span>
											) : null}
										</span>
									) : null}
								</button>
							</li>
						);
					})}
				</ol>
			</nav>
		);

		const content = (
			<div class="default-stepper__content">
				<RuiHeading as="header" size={isSidebar ? 'sm' : 'md'} class="default-stepper__header">
					<RuiHeadingTitle as="h2">{this.$.view.currentTitle}</RuiHeadingTitle>
					<RuiHeadingDescription hidden={this.$.view.descriptionHidden}>
						{this.$.view.currentDescription}
					</RuiHeadingDescription>
				</RuiHeading>
				<slot />
			</div>
		);

		const navigationBar = (
			<div class="default-stepper__navigation">
				<RuiButton
					type="button"
					variant="outline"
					data-se-stepper="previous"
					prop:disabled={this.$.view.isFirstStep}
				>
					Previous
				</RuiButton>
				<RuiBadge variant="muted" data-se-step-chip="">
					{this.$.view.stepChip}
				</RuiBadge>
				<div class="default-stepper__actions">
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

		if (isSidebar) {
			return (
				<div
					class={stepperClassName(
						'default-stepper',
						'default-stepper--sidebar',
						this.stepperClass || undefined,
					)}
					data-se-current-step={this.$.view.currentStepIndex}
					data-se-last-step={this.$.view.lastStepFlag}
				>
					<aside class="default-stepper__sidebar">{indicators}</aside>
					<div class="default-stepper__main">
						{content}
						{navigationBar}
					</div>
				</div>
			);
		}

		return (
			<div
				class={stepperClassName('default-stepper', this.stepperClass || undefined)}
				data-se-current-step={this.$.view.currentStepIndex}
				data-se-last-step={this.$.view.lastStepFlag}
			>
				{indicators}
				{content}
				{navigationBar}
			</div>
		);
	}
}

export function DefaultStepperComposed({ children }: { children?: JsxRenderable }) {
	return <se-default-stepper>{children}</se-default-stepper>;
}
