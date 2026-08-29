import './default-stepper.css';
import './minimalist-stepper.css';
import '@ecopages/radiant-ui/button/styles.css';
import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import '@ecopages/radiant-ui/badge/styles.css';
import { RuiBadge } from '@ecopages/radiant-ui/badge';
import { RuiButton } from '@ecopages/radiant-ui/button';
import type { JsxRenderable } from '@ecopages/jsx';
import { stepperContext } from '@/contexts/stepper-context';
import type { StepperContextValue } from '@/contexts/stepper-context';
import type { DefaultStepperConfig } from './default-stepper.types';

function stepperClassName(...parts: Array<string | false | undefined>) {
	return parts.filter(Boolean).join(' ');
}

@customElement('se-default-stepper')
export class DefaultStepperElement extends RadiantElement {
	@prop({ type: String }) stepperClass = '';

	@contextSelector({ context: stepperContext })
	stepperContext!: StepperContextValue<DefaultStepperConfig>;

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
		const orientation = config.orientation ?? 'horizontal';
		const showStepNumbers = config.showStepNumbers ?? true;
		const showStepTitles = config.showStepTitles ?? true;
		const showStepDescriptions = config.showStepDescriptions ?? false;
		const currentStep = steps[currentStepIndex];
		const isSidebar = orientation === 'sidebar';

		const indicators = (
			<nav aria-label="Form progress" class="default-stepper__progress">
				<ol class="default-stepper__steps">
					{steps.map((step, index) => {
						const isDisabled = !step.isVisited && index > currentStepIndex;
						const title = step.title || `Step ${index + 1}`;
						return (
							<li key={step.id} class="default-stepper__step-item">
								<button
									type="button"
									class={stepperClassName(
										'default-stepper__step-button',
										step.isActive ? 'default-stepper__step-button--active' : undefined,
									)}
									on:click={() => navigation.goToStep(index)}
									disabled={isDisabled}
									aria-current={step.isActive ? 'step' : undefined}
									aria-label={title}
								>
									{showStepNumbers ? (
										<span
											class={stepperClassName(
												'default-stepper__indicator',
												step.isCompleted ? 'default-stepper__indicator--completed' : undefined,
												step.isActive && !step.isCompleted
													? 'default-stepper__indicator--active'
													: undefined,
											)}
										>
											{step.isCompleted ? '✓' : index + 1}
										</span>
									) : null}
									{showStepTitles || (showStepDescriptions && step.description) ? (
										<span class="default-stepper__step-copy">
											{showStepTitles ? (
												<span class="default-stepper__step-title">{title}</span>
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
				<header class="default-stepper__header">
					<h2
						class={stepperClassName(
							'default-stepper__title',
							isSidebar ? 'default-stepper__title--sidebar' : undefined,
						)}
					>
						{currentStep?.title || `Step ${currentStepIndex + 1}`}
					</h2>
					{currentStep?.description ? (
						<p class="default-stepper__description">{currentStep.description}</p>
					) : null}
				</header>
				<slot />
			</div>
		);

		const navigationBar = (
			<div class="default-stepper__navigation">
				<RuiButton
					type="button"
					variant="outline"
					on:click={() => navigation.goToPreviousStep()}
					disabled={navigation.isFirstStep}
				>
					Previous
				</RuiButton>
				<RuiBadge variant="muted">
					Step {currentStepIndex + 1} of {steps.length}
				</RuiBadge>
				<div class="default-stepper__actions">
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

		if (isSidebar) {
			return (
				<div
					class={stepperClassName(
						'default-stepper',
						'default-stepper--sidebar',
						this.stepperClass || undefined,
					)}
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
			<div class={stepperClassName('default-stepper', this.stepperClass || undefined)}>
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
