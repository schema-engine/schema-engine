import { customElement, onEvent, prop, RadiantElement, state } from '@ecopages/radiant';
import { provideContext, type ContextProvider } from '@ecopages/radiant/context';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { FormConfig } from '@schema-engine/forms/schemas';
import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import {
	formInstanceContext,
	type FormInstanceContextValue,
	type PendingNavigation,
	type StepStates,
} from '@/contexts/form-instance-context';
import { markNextStepSubmit } from '@/lib/form-navigation-state';
import { requestNearestFormValidation } from '@/lib/rui-form-utils';
import { renderMultiStepForm } from '@/components/internals/form-elements-renderer';
import { ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';

function createInitialStepStates(totalSteps: number): StepStates {
	return {
		completed: Array.from({ length: totalSteps }, () => false),
		valid: Array.from({ length: totalSteps }, () => false),
		visited: Array.from({ length: totalSteps }, () => false),
	};
}

@customElement('se-form-instance')
export class FormInstanceElement extends RadiantElement {
	@prop({ type: Object }) config!: FormConfig;
	@prop({ type: Object }) engine?: CoreFormEngine;
	@prop({ type: Object }) defaultValues?: Record<string, unknown>;
	@prop({ type: Boolean, defaultValue: false }) isSubmitting = false;
	onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;

	@state currentStep = 0;
	@state stepStates: StepStates = { completed: [], valid: [], visited: [] };
	@state pendingNavigation: PendingNavigation = null;

	@provideContext<typeof formInstanceContext>({
		context: formInstanceContext,
		initialValue: {} as FormInstanceContextValue,
	})
	provider!: ContextProvider<typeof formInstanceContext>;

	protected override onConnected(): void {
		this.resetStepState();
		this.publishContext();
		this.registerCleanupCallback(() => {
			this.pendingNavigation = null;
		});
	}

	protected onUpdated(): void {
		this.publishContext();
	}

	@onEvent({ type: 'rui-submit', selector: 'rui-form' })
	onFormSubmit(): void {
		if (this.pendingNavigation === 'next' && !this.isLastStep()) {
			this.markStepCompleted(this.currentStep);
			this.markStepVisited(this.currentStep + 1);
			this.currentStep += 1;
			this.pendingNavigation = null;
			markNextStepSubmit();
		}
	}

	@onEvent({ type: 'rui-invalid', selector: 'rui-form' })
	onFormInvalid(): void {
		this.pendingNavigation = null;
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

	private markStepCompleted(index: number): void {
		this.stepStates = {
			...this.stepStates,
			completed: this.stepStates.completed.map((value, stepIndex) => (stepIndex === index ? true : value)),
			valid: this.stepStates.valid.map((value, stepIndex) => (stepIndex === index ? true : value)),
		};
	}

	private markStepVisited(index: number): void {
		this.stepStates = {
			...this.stepStates,
			visited: this.stepStates.visited.map((value, stepIndex) => (stepIndex === index ? true : value)),
		};
	}

	private goToStep(index: number): void {
		const total = this.config?.steps.length ?? 1;
		if (index < 0 || index >= total) {
			return;
		}
		this.currentStep = index;
		this.markStepVisited(index);
		this.pendingNavigation = null;
	}

	private goToNextStep(): void {
		if (this.isLastStep()) {
			return;
		}
		this.pendingNavigation = 'next';
		requestNearestFormValidation(this);
	}

	private goToPreviousStep(): void {
		if (this.currentStep <= 0) {
			return;
		}
		this.currentStep -= 1;
		this.pendingNavigation = null;
	}

	private getContextValue(): FormInstanceContextValue {
		const totalSteps = this.config?.steps.length ?? 1;
		return {
			currentStep: this.currentStep,
			totalSteps,
			stepStates: this.stepStates,
			pendingNavigation: this.pendingNavigation,
			setPendingNavigation: (next) => {
				this.pendingNavigation = next;
				this.publishContext();
			},
			goToStep: (index) => this.goToStep(index),
			goToNextStep: () => this.goToNextStep(),
			goToPreviousStep: () => this.goToPreviousStep(),
			markStepCompleted: (index) => this.markStepCompleted(index),
			markStepVisited: (index) => this.markStepVisited(index),
			isSubmitting: this.isSubmitting,
		};
	}

	private publishContext(): void {
		this.provider.setContext(this.getContextValue());
	}

	override render(): JsxRenderable {
		const config = this.config;
		if (!config) {
			return null;
		}

		return (
			<ConfiguredRuiForm config={config} defaultValues={this.defaultValues} onSubmit={this.onSubmit}>
				{renderMultiStepForm(config, this.engine, this.getContextValue())}
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
}: {
	config: FormConfig;
	engine?: CoreFormEngine;
	defaultValues?: Record<string, unknown>;
	onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	isSubmitting?: boolean;
}): JsxRenderable {
	return jsx('se-form-instance', {
		'prop:config': config,
		'prop:engine': engine,
		'prop:defaultValues': defaultValues,
		'prop:isSubmitting': isSubmitting,
		'prop:onSubmit': onSubmit,
	});
}
