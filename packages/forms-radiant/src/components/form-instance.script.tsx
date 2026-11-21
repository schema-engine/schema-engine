import {
	customElement,
	onEvent,
	onUpdated,
	query,
	RadiantElement,
	registerSsrPreparationCallback,
	state,
	prop,
} from '@ecopages/radiant';
import type { JSX_PROPS } from '@ecopages/jsx';
import { getViewRecipe } from '@schema-engine/forms/recipes';
import { onContextUpdate, provideContext, type ContextProvider } from '@ecopages/radiant/context';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import { flattenStepElements } from '@schema-engine/forms/lib/field-scope';
import type { FormEngineRuntime as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { formInstanceContext, type FormInstanceContextValue, type StepStates } from '@/contexts/form-instance-context';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { formEngineContext } from '@/components/provider';
import { connectValidationDependencies } from '@/lib/validation-deps';
import type { RuiFormElement } from '@ecopages/radiant-ui/form';
import { createChangeDetector, expandValues } from '@/adapters/radiant/controller/values';
import { createInitialStepStates, hasConfiguredActions, type StepMachineState } from '@schema-engine/forms/engine';
import { createFormMeta, type FormMeta } from '@/lib/instance-view';
import { createInstanceNavigation } from '@/lib/instance-navigation';
import { createAuthoredDisabledLookup } from '@/lib/authored-disabled';
import { formValuesContext, type FormValuesContextValue } from '@/contexts/constraint-context';
import { logger } from '@/lib/logger';
import type { FormProviderProps } from '@/adapters/types';
import { FormController } from '@/adapters/radiant/controller';
import { FormActions, type SubmissionOutcome } from '@/adapters/radiant/form-actions';

const MISSING_ENGINE_MESSAGE =
	'The form is in use without a FormEngine, so the engine validation rules and actions do not run. Assign `engine` to the enclosing `se-form-renderer`, or pass `engine` to `FormRenderer`.';

/** Properties of `<se-form-instance>`. */
export interface FormInstanceProps {
	config: NormalizedFormConfig;
	defaultValues?: Record<string, unknown>;
	engine?: CoreFormEngine;
	onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	onChange?: FormProviderProps['onChange'];
	onAction?: FormProviderProps['onAction'];
}

/** Detail of `se-action-submit-complete`; `error` is set when `onSubmit` rejected or the action lifecycle failed. */
export interface SubmissionCompleteDetail extends Pick<SubmissionOutcome, 'succeeded' | 'results'> {
	error?: unknown;
}

/** Behavior and engine navigation state for one composed form. */
@customElement('se-form-instance')
export class FormInstanceElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: FormInstanceProps;

	private readonly navigation = createInstanceNavigation(
		this,
		() => this.form,
		() => this.actions,
	);
	/** Frozen config from `engine.defineForm` / `engine.validateForm` via `FormProvider`. */
	@prop({ type: Object }) config!: NormalizedFormConfig;
	@state engine?: CoreFormEngine;
	@prop({ type: Object }) defaultValues?: Record<string, unknown>;
	@state onChange?: FormProviderProps['onChange'];
	@state onAction?: FormProviderProps['onAction'];
	@state onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	@state private submitting = false;
	get isSubmitting(): boolean {
		return this.submitting;
	}
	@query('rui-form') private ruiForm!: RuiFormElement | null;
	private unwatchChanges?: () => void;
	private actions?: FormActions;

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
	private rendererEngine?: CoreFormEngine;
	private reportedMissingEngine = false;
	private unwatchValidationDependencies?: () => void;

	@provideContext<typeof formInstanceContext>({
		context: formInstanceContext,
		initialValue: undefined,
		serialize: () => ({}),
	})
	provider!: ContextProvider<typeof formInstanceContext>;

	@provideContext<typeof formValuesContext>({
		context: formValuesContext,
		initialValue: undefined,
		serialize: () => ({}),
	})
	protected valuesProvider!: ContextProvider<typeof formValuesContext>;

	constructor() {
		super();
		registerSsrPreparationCallback(this, () => this.publish());
	}

	/**
	 * @remarks
	 * The engine is an explicit `engine`, then the enclosing `se-form-renderer`'s
	 * context (see {@link onRendererEngine}), then the owning render. The `rui-form`
	 * is a light-DOM descendant the view authors, so it exists when this host connects.
	 */
	protected override onConnected(): void {
		this.engine ??= resolveFormEngine(this);
		this.resetStepState();
		this.connectForm();
	}

	/**
	 * Follows the engine the enclosing renderer publishes, including one bound after this host connected.
	 *
	 * @remarks
	 * An `engine` assigned to this host directly wins: only an unset engine, or one that came
	 * from the renderer, is replaced.
	 */
	@onContextUpdate({ context: formEngineContext, select: (context) => context?.engine, requestUpdate: false })
	onRendererEngine(engine: CoreFormEngine | undefined): void {
		if (!engine) return;
		if (this.engine === undefined || this.engine === this.rendererEngine) this.engine = engine;
		this.rendererEngine = engine;
	}

	override disconnectedCallback(): void {
		this.navigation.cancel();
		this.stopWatchingValidationDependencies();
		this.disposeActions();
		if (this.form?.host) (this.form.host as RuiFormElement).onSubmit = undefined;
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
	}

	@onUpdated(['engine'])
	onEngineUpdated(): void {
		this.connectForm();
		this.publish();
	}

	/**
	 * Reports, once per form, that the form is in use without an engine.
	 *
	 * @remarks
	 * A host stays quiet while it connects because the app may bind the engine to the renderer
	 * later. Focusing into the form or submitting it is the point where it is in use, and without
	 * an engine the engine rules, validators and actions do not run.
	 */
	@onEvent({ type: 'focusin', host: true })
	warnWithoutEngine(): void {
		if (this.engine || this.reportedMissingEngine) return;
		this.reportedMissingEngine = true;
		logger.warn(MISSING_ENGINE_MESSAGE);
	}

	/**
	 * Turns a native submit before the last step of a wizard into Next.
	 *
	 * @remarks
	 * Removing the submit button only stops implicit submission when the form has two or
	 * more fields that block it. A wizard with one text input would submit on Enter, and
	 * `rui-form` would then mark the later steps invalid. The capture phase runs before
	 * `rui-form` sees the event.
	 */
	@onEvent({ type: 'submit', host: true, options: { capture: true } })
	onNativeSubmit(event: Event): void {
		this.warnWithoutEngine();
		if (this.submitting || this.form?.store?.isSubmitting) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		const { isWizard, currentStep, totalSteps } = this.getContextValue();
		if (!isWizard || currentStep >= totalSteps - 1) return;
		event.preventDefault();
		event.stopPropagation();
		void this.goToNextStep();
	}

	/**
	 * Connects the `rui-form`'s controller once per form element, then keeps
	 * constraints, validation dependencies and actions in step with the config
	 * and engine each time it runs.
	 */
	private connectForm(): void {
		const ruiForm = this.ruiForm;
		this.stopWatchingValidationDependencies();
		if (!ruiForm) {
			this.disposeActions();
			this.form?.disconnect();
			this.form = undefined;
			return;
		}
		if (this.form?.host === ruiForm) {
			this.onFormReady();
			return;
		}
		this.unwatchChanges?.();
		this.unwatchChanges = undefined;
		this.disposeActions();
		this.form?.disconnect();
		this.form = new FormController(ruiForm);
		ruiForm.onSubmit = (data) => this.submitForm(ruiForm, data);
		this.form.connect(() => this.onFormReady());
	}

	private onFormReady(): void {
		this.watchFormChanges();
		this.watchValidationDependencies();
		this.syncActions();
	}

	/**
	 * Runs one submission and reports it with `se-action-submit-start` and
	 * `se-action-submit-complete` (with `error` when `onSubmit` rejected or the lifecycle failed) on the `rui-form`, whether or not actions are configured.
	 *
	 * @remarks
	 * The instance owns the submitting state because Radiant UI clears its own
	 * `isSubmitting` after validation, before it awaits `onSubmit`. With no
	 * `onSubmit`, a form with `action` or `method` submits natively once its actions
	 * succeed. A rejected `onSubmit` completes the submission as unsuccessful, runs the error and
	 * complete actions and is logged, not rethrown: the event is how the page learns of it.
	 */
	private async submitForm(ruiForm: RuiFormElement, data: Record<string, unknown>): Promise<void> {
		if (this.submitting) return;
		const announce = (type: string, detail?: unknown) =>
			ruiForm.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
		this.setSubmitting(true);
		announce('se-action-submit-start');
		const submit = async () => {
			if (this.onSubmit) {
				await this.onSubmit(expandValues(data));
			} else if (ruiForm.hasAttribute('action') || ruiForm.hasAttribute('method')) {
				ruiForm.querySelector<HTMLFormElement>('form[data-ref="form"]')?.submit();
			}
		};
		let detail: SubmissionCompleteDetail;
		try {
			if (this.actions) {
				const { succeeded, results, failure } = await this.actions.submit(submit);
				detail = { succeeded, results, ...(failure ? { error: failure.error } : {}) };
			} else {
				await submit();
				detail = { succeeded: true, results: [] };
			}
		} catch (error) {
			detail = { succeeded: false, results: [], error };
		} finally {
			this.setSubmitting(false);
		}
		if ('error' in detail) logger.error('Form submission failed', detail.error);
		announce('se-action-submit-complete', detail);
	}

	private setSubmitting(submitting: boolean): void {
		this.submitting = submitting;
		this.publish();
	}

	/**
	 * Builds the actions for the current engine, or drops them when the form configures none.
	 *
	 * @remarks
	 * `FormProvider` re-validates the config on each render, so a new but equal config
	 * must not rebuild the actions: that would fire `form_mount` again and reset the
	 * submit attempts. Only an engine change rebuilds them.
	 */
	private syncActions(): void {
		const { config, engine, form } = this;
		if (!form || !config || !engine || !hasConfiguredActions(config)) {
			this.disposeActions();
			return;
		}
		if (this.actions?.engine !== engine) {
			this.disposeActions();
			this.actions = new FormActions({
				config: () => this.config,
				engine,
				form,
				currentStep: () => this.currentStep,
				onAction: (action, data) => this.onAction?.(action, data),
			});
		}
		this.actions.start();
	}

	private disposeActions(): void {
		this.actions?.dispose();
		this.actions = undefined;
	}

	private watchFormChanges(): void {
		if (!this.form?.ready) return;
		if (this.unwatchChanges) {
			this.publishFormValues();
			return;
		}
		const changed = createChangeDetector();
		this.unwatchChanges = this.form.watchForm((values) => {
			this.publishFormValues(values);
			if (changed(values)) this.onChange?.(values);
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
			meta: this.meta(),
			goToStep: this.goToStep,
			goToNextStep: this.goToNextStep,
			goToPreviousStep: this.goToPreviousStep,
			markStepCompleted: this.markStepCompleted,
			markStepVisited: this.markStepVisited,
			isSubmitting: this.submitting,
		};
	}

	private metaSource?: NormalizedFormConfig;
	private metaValue?: FormMeta;

	/** @remarks Memoized per config so consumers see a new `meta` only when the config changes. */
	private meta(): FormMeta | undefined {
		if (!this.config) return undefined;
		if (this.metaSource !== this.config) {
			this.metaSource = this.config;
			this.metaValue = createFormMeta(this.config);
		}
		return this.metaValue;
	}

	private authoredDisabled?: {
		config: NormalizedFormConfig;
		lookup: FormValuesContextValue['isAuthoredDisabled'];
	};

	/**
	 * Hands the live values to the constraint hosts and fields.
	 *
	 * @remarks
	 * The authored-disabled lookup is rebuilt only when the config changes, so a field that
	 * selects it is notified by a new config and not by a value change.
	 */
	private publishFormValues(values = this.form?.getValues()): void {
		const { config } = this;
		if (!values || !config) return;
		if (this.authoredDisabled?.config !== config) {
			this.authoredDisabled = { config, lookup: createAuthoredDisabledLookup(config) };
		}
		this.valuesProvider.setContext({ values, isAuthoredDisabled: this.authoredDisabled.lookup });
	}

	private publish(): void {
		this.provider.setContext(this.getContextValue());
	}
}
