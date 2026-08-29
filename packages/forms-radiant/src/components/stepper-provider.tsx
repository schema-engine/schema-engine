import { customElement, onUpdated, prop, RadiantElement, registerSsrPreparationCallback } from '@ecopages/radiant';
import { provideContext, type ContextProvider } from '@ecopages/radiant/context';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { stepperContext, type StepperContextValue } from '@/contexts/stepper-context';

function stepperPublishKey(value: StepperContextValue, currentStepIndex: number): string {
	const steps = value.steps ?? [];
	return [
		currentStepIndex,
		value.form?.isSubmitting ? '1' : '0',
		steps.map((step) => `${step.id}:${step.isCompleted ? 1 : 0}:${step.isVisited ? 1 : 0}`).join(','),
		JSON.stringify(value.config ?? {}),
	].join('|');
}

@customElement('se-stepper-provider')
export class StepperProviderElement extends RadiantElement {
	@prop({ type: Object }) value!: StepperContextValue;
	@prop({ type: Number, defaultValue: 0 }) currentStepIndex = 0;

	@provideContext<typeof stepperContext>({
		context: stepperContext,
		initialValue: {} as StepperContextValue,
	})
	provider!: ContextProvider<typeof stepperContext>;

	private publishKey = '';

	constructor() {
		super();
		registerSsrPreparationCallback(this, () => this.publish());
	}

	protected override onConnected(): void {
		this.publish();
	}

	@onUpdated(['value', 'currentStepIndex'])
	onProviderPropsUpdated(): void {
		this.publish();
	}

	private publish(): void {
		if (!this.value) {
			return;
		}

		const steps = this.value.steps ?? [];
		const currentStepIndex = this.currentStepIndex ?? this.value.currentStepIndex ?? 0;
		const nextKey = stepperPublishKey(this.value, currentStepIndex);
		if (nextKey === this.publishKey) {
			return;
		}

		const navigation = this.value.navigation;
		if (!navigation) {
			return;
		}

		this.publishKey = nextKey;
		this.provider.setContext({
			...this.value,
			currentStepIndex,
			steps: steps.map((step, index) => ({
				...step,
				isActive: index === currentStepIndex,
			})),
			navigation: {
				goToStep: navigation.goToStep,
				goToNextStep: navigation.goToNextStep,
				goToPreviousStep: navigation.goToPreviousStep,
				canGoNext: currentStepIndex < Math.max(steps.length, 1) - 1,
				canGoPrevious: currentStepIndex > 0,
				isFirstStep: currentStepIndex === 0,
				isLastStep: currentStepIndex === Math.max(steps.length, 1) - 1,
			},
		});
	}

	override render(): JsxRenderable {
		return <slot />;
	}
}

export function StepperProvider({
	value,
	children,
}: {
	value: StepperContextValue;
	children: JsxRenderable;
}): JsxRenderable {
	return jsx('se-stepper-provider', {
		'prop:value': value,
		'prop:currentStepIndex': value.currentStepIndex,
		'attr:data-current-step': String(value.currentStepIndex ?? 0),
		children,
	});
}
