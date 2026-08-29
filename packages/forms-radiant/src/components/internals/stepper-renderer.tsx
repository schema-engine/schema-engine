import type { JsxRenderable } from '@ecopages/jsx';
import type { FormConfig, FormStep } from '@schema-engine/forms/schemas';
import type { FormStepperConfig } from '@schema-engine/forms/schemas/form-config';
import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { formEngineContext, type FormEngineContextValue } from '@/components/provider';
import { StepperProvider } from '@/components/stepper-provider';
import { HeadlessStepper } from '@/components/steppers/headless-stepper';
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

	const contextValue = {
		steps: stepInfos,
		currentStepIndex,
		navigation: {
			canGoNext: navigation.canGoNext,
			canGoPrevious: navigation.canGoPrevious,
			isFirstStep: currentStepIndex === 0,
			isLastStep: currentStepIndex === steps.length - 1,
			goToStep: navigation.goToStep,
			goToNextStep: navigation.goToNextStep,
			goToPreviousStep: navigation.goToPreviousStep,
		},
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
				<HeadlessStepper>{children}</HeadlessStepper>
			</StepperProvider>
		);
	}

	const { $type, ...stepperConfig } = form.stepper;
	const stepperRegistration = engine?.getStepper($type);

	if (!stepperRegistration) {
		return (
			<StepperProvider value={{ ...contextValue, config: stepperConfig }}>
				<HeadlessStepper>{children}</HeadlessStepper>
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
