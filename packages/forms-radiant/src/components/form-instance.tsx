import {
	customElement,
	onUpdated,
	prop,
	RadiantElement,
	registerSsrPreparationCallback,
	state,
} from '@ecopages/radiant';
import { provideContext, type ContextProvider } from '@ecopages/radiant/context';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { formInstanceContext, type FormInstanceContextValue, type StepStates } from '@/contexts/form-instance-context';
import { getRuiFormStore } from '@/lib/rui-form-utils';
import { fieldNamesForStep, validateCurrentStepFields } from '@/lib/validate-current-step';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';
import { resolveFormRecipe } from '@schema-engine/forms';

function createInitialStepStates(totalSteps: number): StepStates {
	return {
		completed: Array.from({ length: totalSteps }, () => false),
		valid: Array.from({ length: totalSteps }, () => false),
		visited: Array.from({ length: totalSteps }, () => false),
	};
}

@customElement('se-form-instance')
export class FormInstanceElement extends RadiantElement {
	/** Frozen config from `engine.defineForm` / `engine.validateForm` via `FormProvider`. */
	@prop({ type: Object }) config!: NormalizedFormConfig;
	@prop({ type: Object }) engine?: CoreFormEngine;
	@prop({ type: Object }) defaultValues?: Record<string, unknown>;
	@prop({ type: Object }) extras?: JsxRenderable;
	@prop({ type: Boolean, defaultValue: false }) isSubmitting = false;
	@prop({ type: Object }) onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;

	@state currentStep = 0;
	@state stepStates: StepStates = { completed: [], valid: [], visited: [] };
	private publishedContext?: FormInstanceContextValue;

	@provideContext<typeof formInstanceContext>({
		context: formInstanceContext,
		initialValue: {} as FormInstanceContextValue,
		serialize: () => ({}),
	})
	provider!: ContextProvider<typeof formInstanceContext>;

	constructor() {
		super();
		registerSsrPreparationCallback(this, () => this.publishContext());
	}

	protected override onConnected(): void {
		this.resetStepState();
		this.publishContext();
	}

	@onUpdated(['config'])
	onConfigUpdated(): void {
		this.resetStepState();
	}

	@onUpdated(['currentStep', 'stepStates', 'isSubmitting'])
	onInstanceStateUpdated(): void {
		this.publishContext();
	}

	private resetStepState(): void {
		const total = this.config?.steps.length ?? 1;
		this.currentStep = 0;
		this.stepStates = createInitialStepStates(total);
		this.markStepVisited(0);
	}

	private isLastStep(): boolean {
		return this.currentStep >= (this.config?.steps.length ?? 1) - 1;
	}

	readonly markStepCompleted = (index: number): void => {
		this.stepStates = {
			...this.stepStates,
			completed: this.stepStates.completed.map((value, stepIndex) => (stepIndex === index ? true : value)),
			valid: this.stepStates.valid.map((value, stepIndex) => (stepIndex === index ? true : value)),
		};
	};

	readonly markStepVisited = (index: number): void => {
		this.stepStates = {
			...this.stepStates,
			visited: this.stepStates.visited.map((value, stepIndex) => (stepIndex === index ? true : value)),
		};
	};

	readonly goToStep = (index: number): void => {
		const total = this.config?.steps.length ?? 1;
		if (index < 0 || index >= total) {
			return;
		}
		this.currentStep = index;
		this.markStepVisited(index);
	};

	readonly goToNextStep = async (): Promise<void> => {
		if (this.isLastStep()) {
			return;
		}

		const store = getRuiFormStore(this);
		if (!store) {
			return;
		}

		const isValid = await validateCurrentStepFields(store, fieldNamesForStep(this.config?.steps[this.currentStep]));
		if (!isValid) {
			return;
		}

		this.markStepCompleted(this.currentStep);
		this.markStepVisited(this.currentStep + 1);
		this.currentStep += 1;
	};

	readonly goToPreviousStep = (): void => {
		if (this.currentStep <= 0) {
			return;
		}
		this.currentStep -= 1;
	};

	getContextValue(): FormInstanceContextValue {
		const totalSteps = this.config?.steps.length ?? 1;
		return {
			currentStep: this.currentStep,
			totalSteps,
			stepStates: this.stepStates,
			goToStep: this.goToStep,
			goToNextStep: this.goToNextStep,
			goToPreviousStep: this.goToPreviousStep,
			markStepCompleted: this.markStepCompleted,
			markStepVisited: this.markStepVisited,
			isSubmitting: this.isSubmitting,
		};
	}

	private publishContext(): void {
		const next = this.getContextValue();
		const previous = this.publishedContext;
		if (
			previous &&
			previous.currentStep === next.currentStep &&
			previous.totalSteps === next.totalSteps &&
			previous.stepStates === next.stepStates &&
			previous.isSubmitting === next.isSubmitting
		) {
			return;
		}

		this.publishedContext = next;
		this.provider.setContext(next);
	}

	override render(): JsxRenderable {
		const engine = this.engine;
		if (!engine) {
			throw new Error(`Form '${this.config.id}' requires a FormEngine to render.`);
		}
		const config = this.config;
		const recipe = resolveFormRecipe(config, engine);

		return (
			<ConfiguredRuiForm config={config} defaultValues={this.defaultValues} onSubmit={this.onSubmit}>
				<RecipeRenderer config={config} recipe={recipe} instance={this.getContextValue()}>
					{this.extras}
				</RecipeRenderer>
			</ConfiguredRuiForm>
		);
	}
}

export function FormInstance({
	config,
	engine,
	defaultValues,
	onSubmit,
	isSubmitting = false,
	children,
}: {
	config: NormalizedFormConfig;
	engine: CoreFormEngine;
	defaultValues?: Record<string, unknown>;
	onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	isSubmitting?: boolean;
	children?: JsxRenderable;
}): JsxRenderable {
	return jsx('se-form-instance', {
		'prop:config': config,
		'prop:engine': engine,
		'prop:defaultValues': defaultValues,
		'prop:isSubmitting': isSubmitting,
		'prop:onSubmit': onSubmit,
		'prop:extras': children,
	});
}
