import type { JsxRenderable } from '@ecopages/jsx';
import type { FormConfig, FormStep } from '@schema-engine/forms/schemas';
import type { FormStepperConfig } from '@schema-engine/forms/schemas/form-config';
import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { formEngineContext, type FormEngineContextValue } from '@/components/provider';
import { StepperProvider } from '@/components/stepper-provider';
import type { StepData, StepperNavigation } from '@/components/steppers/types';
interface StepperRendererProps {
	form: Omit<FormConfig, 'stepper'> & { stepper?: FormStepperConfig };
	steps: FormStep[];
	currentStepIndex: number;
	stepStates: {
		completed: boolean[];
		valid: boolean[];
		visited: boolean[];
	};
	navigation: StepperNavigation;
	isSubmitting?: boolean;
	children?: JsxRenderable;
	engine?: FormEngineContextValue['engine'];
}

function HeadlessStepper({
	currentStepIndex,
	navigation,
	isSubmitting,
	children,
	steps,
}: {
	steps: StepData[];
	currentStepIndex: number;
	navigation: StepperNavigation;
	isSubmitting?: boolean;
	children?: JsxRenderable;
}) {
	return (
		<div class="se-headless-stepper">
			<div class="se-headless-stepper__content">{children}</div>

			<div class="se-headless-stepper__controls">
				<button
					type="button"
					class="se-headless-stepper__button"
					on:click={() => navigation.goToPreviousStep()}
					disabled={navigation.isFirstStep}
				>
					Previous
				</button>

				<span class="se-headless-stepper__counter">
					Step {currentStepIndex + 1} of {steps.length}
				</span>

				<div class="se-headless-stepper__actions">
					<button
						type="submit"
						class="se-headless-stepper__button se-headless-stepper__button--primary"
						style={{ display: navigation.isLastStep ? 'inline-flex' : 'none' }}
					>
						{isSubmitting ? 'Submitting...' : 'Submit'}
					</button>

					<button
						type="submit"
						class="se-headless-stepper__button se-headless-stepper__button--primary"
						on:click={() => navigation.goToNextStep()}
						disabled={!navigation.canGoNext}
						style={{ display: navigation.isLastStep ? 'none' : 'inline-flex' }}
					>
						Next
					</button>
				</div>
			</div>
		</div>
	);
}

export function StepperRenderer({
	form,
	steps,
	currentStepIndex,
	stepStates,
	navigation,
	isSubmitting = false,
	children,
	engine,
}: StepperRendererProps): JsxRenderable {
	const stepInfos: StepData[] = steps.map((step, index) => ({
		id: step.id,
		title: step.title,
		description: step.description,
		index,
		total: steps.length,
		isActive: index === currentStepIndex,
		isCompleted: stepStates.completed[index] || false,
		isValid: stepStates.valid[index] || false,
		isVisited: stepStates.visited[index] || false,
	}));

	const navigationControls: StepperNavigation = {
		canGoNext: navigation.canGoNext,
		canGoPrevious: navigation.canGoPrevious,
		isFirstStep: currentStepIndex === 0,
		isLastStep: currentStepIndex === steps.length - 1,
		goToStep: navigation.goToStep,
		goToNextStep: navigation.goToNextStep,
		goToPreviousStep: navigation.goToPreviousStep,
	};

	const contextValue = {
		steps: stepInfos,
		currentStepIndex,
		navigation: navigationControls,
		form: {
			id: form.id,
			title: form.title,
			description: form.description,
			isSubmitting,
		},
		config: form.stepper || {},
	};

	if (!form.stepper?.$type) {
		return (
			<StepperProvider value={contextValue}>
				<HeadlessStepper
					steps={stepInfos}
					currentStepIndex={currentStepIndex}
					navigation={navigationControls}
					isSubmitting={isSubmitting}
				>
					{children}
				</HeadlessStepper>
			</StepperProvider>
		);
	}

	const { $type, ...stepperConfig } = form.stepper;
	const stepperRegistration = engine?.getStepper($type);

	if (!stepperRegistration) {
		return (
			<StepperProvider value={{ ...contextValue, config: stepperConfig }}>
				<HeadlessStepper
					steps={stepInfos}
					currentStepIndex={currentStepIndex}
					navigation={navigationControls}
					isSubmitting={isSubmitting}
				>
					{children}
				</HeadlessStepper>
			</StepperProvider>
		);
	}

	const StepperComponent = stepperRegistration.render as (props: { children?: JsxRenderable }) => JsxRenderable;

	return (
		<StepperProvider value={{ ...contextValue, config: stepperConfig }}>
			<StepperComponent>{children}</StepperComponent>
		</StepperProvider>
	);
}

@customElement('se-stepper-renderer')
export class StepperRendererHost extends RadiantElement {
	@prop({ type: Object }) form!: FormConfig;
	@prop({ type: Array }) steps!: FormStep[];
	@prop({ type: Number }) currentStepIndex = 0;
	@prop({ type: Object }) stepStates!: StepperRendererProps['stepStates'];
	@prop({ type: Object }) navigation!: StepperNavigation;
	@prop({ type: Boolean, defaultValue: false }) isSubmitting = false;

	@contextSelector({ context: formEngineContext })
	engineContext!: FormEngineContextValue;

	override render(): JsxRenderable {
		return (
			<StepperRenderer
				form={this.form}
				steps={this.steps}
				currentStepIndex={this.currentStepIndex}
				stepStates={this.stepStates}
				navigation={this.navigation}
				isSubmitting={this.isSubmitting}
				engine={this.engineContext?.engine}
			>
				<slot />
			</StepperRenderer>
		);
	}
}
