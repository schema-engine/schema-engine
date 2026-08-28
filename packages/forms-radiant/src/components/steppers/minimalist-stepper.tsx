import './minimalist-stepper.css';
import '@ecopages/radiant-ui/button/styles.css';
import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { RuiButton } from '@ecopages/radiant-ui/button';
import type { JsxRenderable } from '@ecopages/jsx';
import { stepperContext } from '@/contexts/stepper-context';
import type { StepperContextValue } from '@/contexts/stepper-context';
import type { MinimalistStepperConfig } from './minimalist-stepper.types';

@customElement('se-minimalist-stepper')
export class MinimalistStepperElement extends RadiantElement {
	@prop({ type: String }) stepperClass = '';

	@contextSelector({ context: stepperContext })
	stepperContext!: StepperContextValue<MinimalistStepperConfig>;

	override render(): JsxRenderable {
		const { steps, currentStepIndex, navigation, form, config } = this.stepperContext ?? {
			steps: [],
			currentStepIndex: 0,
			navigation: {
				canGoNext: false,
				canGoPrevious: false,
				isFirstStep: true,
				isLastStep: true,
				goToStep: () => undefined,
				goToNextStep: () => undefined,
				goToPreviousStep: () => undefined,
			},
			form: {},
			config: {},
		};
		const showProgress = config.showProgress ?? true;
		const currentStep = steps[currentStepIndex];
		const progressValue = ((currentStepIndex + 1) / Math.max(steps.length, 1)) * 100;

		return (
			<div class={`minimalist-stepper ${this.stepperClass}`.trim()}>
				{showProgress ? (
					<div class="minimalist-stepper__progress">
						<div class="minimalist-stepper__progress-labels">
							<span>Progress</span>
							<span>{Math.round(progressValue)}%</span>
						</div>
						<div class="minimalist-stepper__progress-bar" aria-hidden="true">
							<div class="minimalist-stepper__progress-fill" style={{ width: `${progressValue}%` }} />
						</div>
					</div>
				) : null}
				<header class="minimalist-stepper__header">
					<p class="minimalist-stepper__counter">
						Step {currentStepIndex + 1} of {steps.length}
					</p>
					<h2 class="minimalist-stepper__title">{currentStep?.title || `Step ${currentStepIndex + 1}`}</h2>
					{currentStep?.description ? (
						<p class="minimalist-stepper__description">{currentStep.description}</p>
					) : null}
				</header>
				<div class="minimalist-stepper__content">
					<slot />
				</div>
				<div class="minimalist-stepper__navigation">
					<RuiButton
						type="button"
						variant="ghost"
						on:click={() => navigation.goToPreviousStep()}
						disabled={navigation.isFirstStep}
					>
						Previous
					</RuiButton>
					<RuiButton type="submit" style={{ display: navigation.isLastStep ? 'inline-flex' : 'none' }}>
						{form.isSubmitting ? 'Submitting...' : 'Submit'}
					</RuiButton>
					<RuiButton
						type="submit"
						style={{ display: navigation.isLastStep ? 'none' : 'inline-flex' }}
						on:click={() => navigation.goToNextStep()}
						disabled={!navigation.canGoNext}
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
