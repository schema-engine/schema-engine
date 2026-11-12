import {
	customElement,
	onUpdated,
	prop,
	RadiantElement,
	registerSsrPreparationCallback,
	state,
} from '@ecopages/radiant';
import { getViewRecipe } from '@schema-engine/forms/recipes';
import { onContextUpdate, provideContext, type ContextProvider } from '@ecopages/radiant/context';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import { flattenStepElements } from '@schema-engine/forms/lib/field-scope';
import type { FormEngineRuntime as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { formInstanceContext, type FormInstanceContextValue, type StepStates } from '@/contexts/form-instance-context';
import { formEngineContext, type FormEngineContextValue } from '@/components/provider';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { findNearestRuiForm } from '@/lib/rui-form-utils';
import { connectValidationDependencies } from '@/lib/validation-deps';
import type { RuiFormElement } from '@ecopages/radiant-ui/form';
import { expandValues } from '@/adapters/radiant/controller/values';
import { createInitialStepStates, type StepMachineState } from '@schema-engine/forms/engine';
import { createInstanceNavigation } from '@/lib/instance-navigation';
import { syncConstraints } from '@/lib/constraint-sync';
import type { FormProviderProps } from '@/adapters/types';
import type { FormActionControllerElement, SubmissionOutcome } from './form-action-controller';
import { logger } from '@/lib/logger';
import { FormController } from '@/adapters/radiant/controller';

/** Behavior and engine navigation state for one composed form. */
@customElement('se-form-instance')
export class FormInstanceElement extends RadiantElement {
	private readonly navigation = createInstanceNavigation(this, () => this.form);
	/** Frozen config from `engine.defineForm` / `engine.validateForm` via `FormProvider`. */
	@prop({ type: Object }) config!: NormalizedFormConfig;
	@state engine?: CoreFormEngine;
	@prop({ type: Object }) defaultValues?: Record<string, unknown>;
	@state onChange?: FormProviderProps['onChange'];
	private unwatchChanges?: () => void;
	@state onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	@state private submitting = false;
	get isSubmitting(): boolean {
		return this.submitting;
	}

	@state private machineState: StepMachineState = { currentStepIndex: 0, ...createInitialStepStates(1) };
	get machine(): StepMachineState {
		return this.machineState;
	}
	/**
	 * @remarks
	 * Publishes the instance context in the same turn, not from the batched
	 * `@onUpdated` callback, because the step navigator dispatches `step_change`
	 * right after it applies the new state and the action context reads the
	 * current step from this context.
	 */
	set machine(machine: StepMachineState) {
		this.machineState = machine;
		this.publish();
	}
	get currentStep(): number {
		return this.machine.currentStepIndex;
	}
	get stepStates(): StepStates {
		return this.machine;
	}
	private form?: FormController;
	private unwatchValidationDependencies?: () => void;

	@provideContext<typeof formInstanceContext>({
		context: formInstanceContext,
		initialValue: {} as FormInstanceContextValue,
		serialize: () => ({}),
	})
	provider!: ContextProvider<typeof formInstanceContext>;

	constructor() {
		super();
		registerSsrPreparationCallback(this, () => this.publish());
		this.publish();
	}

	@onContextUpdate({ context: formEngineContext, requestUpdate: false })
	onFormEngine(value: FormEngineContextValue): void {
		if (value.engine && !this.engine) {
			this.engine = value.engine;
			this.publish();
		}
	}

	/** @remarks Client mounting can connect this host before its authored form children are attached. */
	protected override onConnected(): void {
		if (!this.engine) {
			this.engine = resolveFormEngine(this);
		}
		this.resetStepState();
		this.connectForm();
		this.wireRuiForm();
		queueMicrotask(() => {
			if (!this.isConnected) return;
			this.connectForm();
			this.wireRuiForm();
		});
	}

	override disconnectedCallback(): void {
		this.navigation.cancel();
		this.stopWatchingValidationDependencies();
		this.unwatchChanges?.();
		this.unwatchChanges = undefined;
		this.form?.disconnect();
		this.form = undefined;
		super.disconnectedCallback();
	}

	@onUpdated(['config'])
	onConfigUpdated(): void {
		this.resetStepState();
		this.connectForm();
		this.wireRuiForm();
	}

	@onUpdated(['machineState', 'engine', 'onSubmit'])
	onInstanceStateUpdated(): void {
		this.wireRuiForm();
		this.connectForm();
		this.publish();
	}

	private wireRuiForm(): void {
		const ruiForm = (this.form?.host ?? findNearestRuiForm(this)) as RuiFormElement | undefined;
		if (!ruiForm) return;
		const actions = this.querySelector<FormActionControllerElement>('se-form-action-controller');
		ruiForm.onSubmit =
			this.onSubmit || actions ? (data) => this.submitForm(ruiForm, data, actions ?? undefined) : undefined;
	}

	/**
	 * Runs one submission and reports it with `se-action-submit-start` and
	 * `se-action-submit-complete` on the `rui-form`, whether or not actions are configured.
	 *
	 * @remarks
	 * The instance owns the submitting state because Radiant UI clears its own
	 * `isSubmitting` after validation, before it awaits `onSubmit`. A rejected
	 * `onSubmit` completes the submission as unsuccessful and is logged, not rethrown:
	 * the event is how the page learns of it.
	 */
	private async submitForm(
		ruiForm: RuiFormElement,
		data: Record<string, unknown>,
		actions: FormActionControllerElement | undefined,
	): Promise<void> {
		const announce = (type: string, detail?: unknown) =>
			ruiForm.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
		this.setSubmitting(true);
		announce('se-action-submit-start');
		let outcome: SubmissionOutcome = { succeeded: true, results: [] };
		try {
			if (actions) outcome = await actions.submit();
			if (outcome.succeeded) {
				if (this.onSubmit) {
					await this.onSubmit(expandValues(data));
				} else if (ruiForm.hasAttribute('action') || ruiForm.hasAttribute('method')) {
					ruiForm.querySelector<HTMLFormElement>('form[data-ref="form"]')?.submit();
				}
			}
		} catch (error) {
			outcome = { succeeded: false, results: outcome.results };
			logger.error('Form submission failed', error);
		} finally {
			this.setSubmitting(false);
			announce('se-action-submit-complete', outcome);
		}
	}

	private setSubmitting(submitting: boolean): void {
		this.submitting = submitting;
		this.publish();
	}

	private connectForm(): void {
		const ruiForm = findNearestRuiForm(this);
		this.stopWatchingValidationDependencies();
		if (!ruiForm) {
			this.form?.disconnect();
			this.form = undefined;
			return;
		}
		if (this.form?.host === ruiForm) {
			this.watchFormChanges();
			syncConstraints(this, this.config, this.form);
			this.watchValidationDependencies();
			return;
		}
		this.unwatchChanges?.();
		this.unwatchChanges = undefined;
		this.form?.disconnect();
		this.form = new FormController(ruiForm);
		this.form.connect(() => {
			this.watchFormChanges();
			syncConstraints(this, this.config, this.form);
			this.watchValidationDependencies();
		});
	}

	private watchFormChanges(): void {
		if (!this.form?.ready || this.unwatchChanges) return;
		this.unwatchChanges = this.form.watchForm((values) => {
			syncConstraints(this, this.config, this.form);
			this.onChange?.(values);
		});
	}

	private watchValidationDependencies(): void {
		if (this.unwatchValidationDependencies || !this.config || !this.form?.ready || !this.engine) {
			return;
		}
		this.unwatchValidationDependencies = connectValidationDependencies(
			this.form,
			flattenStepElements(this.config.steps),
			this.engine.getValidationRegistry(),
		);
	}

	private stopWatchingValidationDependencies(): void {
		this.unwatchValidationDependencies?.();
		this.unwatchValidationDependencies = undefined;
	}

	/** @remarks Cancels a navigation in flight so it cannot overwrite the reset state or dispatch step triggers after it. */
	private resetStepState(): void {
		this.navigation.cancel();
		this.machine = { currentStepIndex: 0, ...createInitialStepStates(this.config?.steps.length ?? 1) };
	}

	readonly markStepCompleted = this.navigation.markStepCompleted;
	readonly markStepVisited = this.navigation.markStepVisited;
	readonly goToStep = this.navigation.goToStep;
	readonly goToNextStep = this.navigation.goToNextStep;
	readonly goToPreviousStep = this.navigation.goToPreviousStep;

	getContextValue(): FormInstanceContextValue {
		const totalSteps = this.config?.steps.length ?? 1;
		return {
			currentStep: this.currentStep,
			totalSteps,
			isWizard: this.config && this.engine ? getViewRecipe(this.engine, this.config)?.kind === 'wizard' : false,
			stepStates: this.stepStates,
			goToStep: this.goToStep,
			goToNextStep: this.goToNextStep,
			goToPreviousStep: this.goToPreviousStep,
			markStepCompleted: this.markStepCompleted,
			markStepVisited: this.markStepVisited,
			isSubmitting: this.submitting,
		};
	}

	private publish(): void {
		this.provider.setContext(this.getContextValue());
	}
}
