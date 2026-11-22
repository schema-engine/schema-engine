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
import { collectInitialValues, flattenStepElements } from '@schema-engine/forms/lib/field-scope';
import type { FormEngineRuntime as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import {
	createFormStateContainer,
	FORM_ROOT,
	type FormIssueFormatter,
	type FormStateContainer,
	type FormStateError,
	type FormStateHydration,
	type FormSubmitResult,
} from '@schema-engine/forms/state-container';
import { formInstanceContext, type FormInstanceContextValue, type StepStates } from '@/contexts/form-instance-context';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { formEngineContext } from '@/components/provider';
import type { RuiFormElement, RuiFormSubmitContext } from '@ecopages/radiant-ui/form';
import {
	createInitialStepStates,
	createSubmissionGuard,
	type SubmissionGuard,
	hasConfiguredActions,
	type StepMachineState,
} from '@schema-engine/forms/engine';
import { createFormMeta, type FormMeta } from '@/lib/instance-view';
import { createInstanceNavigation } from '@/lib/instance-navigation';
import { createAuthoredDisabledLookup } from '@/lib/authored-disabled';
import { observeValues } from '@/lib/observe-values';
import { formValuesContext, type FormValuesContextValue } from '@/contexts/constraint-context';
import { logger } from '@/lib/logger';
import { csrfFieldFor } from '@schema-engine/forms/csrf';
import { syncCsrfField } from '@/lib/csrf-field';
import type { FormProviderProps, FormSubmitContext } from '@/adapters/types';
import { FormActions, type SubmissionOutcome } from '@/adapters/radiant/form-actions';

const MISSING_ENGINE_MESSAGE =
	'The form is in use without a FormEngine, so the engine validation rules and actions do not run. Assign `engine` to the enclosing `se-form-renderer`, or pass `engine` to `FormRenderer`.';

/** Properties of `<se-form-instance>`. */
export interface FormInstanceProps {
	config: NormalizedFormConfig;
	defaultValues?: Record<string, unknown>;
	engine?: CoreFormEngine;
	onSubmit?: (data: Record<string, unknown>, context: FormSubmitContext) => void | Promise<void>;
	onChange?: FormProviderProps['onChange'];
	onAction?: FormProviderProps['onAction'];
	/** The server's snapshot of the form (`toHydration(container.getServerSnapshot())`), which the first form of a server-rendered instance starts from. */
	hydration?: FormStateHydration;
}

/** Detail of `se-action-submit-complete`; `error` is set when `onSubmit` rejected or the action lifecycle failed. */
export interface SubmissionCompleteDetail extends Pick<SubmissionOutcome, 'succeeded' | 'results'> {
	error?: unknown;
}

/**
 * The form a `se-form-instance` holds: its state container and the `rui-form` the container is injected into.
 *
 * @remarks Identity of the config, engine, `rui-form` and default values decides whether the form is the same: a new one of them is a new form.
 */
interface BoundForm {
	readonly config: NormalizedFormConfig;
	readonly engine: CoreFormEngine;
	readonly host: RuiFormElement;
	readonly defaultValues: Record<string, unknown> | undefined;
	readonly container: FormStateContainer;
	/** Admits one submission of this form at a time: a validation that hangs on an old form never holds back the next. */
	readonly submission: SubmissionGuard;
}

/**
 * Behavior and engine navigation state for one composed form.
 *
 * @remarks
 * The instance creates one state container per form from the normalized config, the engine's validation
 * registry and the defaults, and hands it to its `rui-form` with `connect`: the form then bridges its
 * controls into the container and presents what the container holds, and the container owns values,
 * validation timing, field state and field arrays. The instance provides the container on its own
 * context, runs a submission through it, and counts the attempts.
 */
@customElement('se-form-instance')
export class FormInstanceElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: FormInstanceProps;

	private readonly navigation = createInstanceNavigation(
		this,
		() => this.bound?.container,
		() => this.ruiForm,
		() => this.actions,
	);
	/** Frozen config from `engine.defineForm` / `engine.validateForm` via `FormProvider`. */
	@prop({ type: Object }) config!: NormalizedFormConfig;
	@state engine?: CoreFormEngine;
	@prop({ type: Object }) defaultValues?: Record<string, unknown>;
	@state onChange?: FormProviderProps['onChange'];
	@state onAction?: FormProviderProps['onAction'];
	@state onSubmit?: (data: Record<string, unknown>, context: FormSubmitContext) => void | Promise<void>;
	/**
	 * What the server's container held: its values and row ids.
	 *
	 * @remarks Used once, for the first form of an instance the server rendered, so the client keeps the rows the server rendered. A new config, engine or default values start a fresh form.
	 */
	@prop({ type: Object }) hydration?: FormStateHydration;
	@state private submitting = false;
	@state private attempts = 0;
	private rendererFormatIssue?: FormIssueFormatter;
	/** Whether no form has been built yet, so the form to build is the one the server rendered, if it did. */
	private firstForm = true;
	get isSubmitting(): boolean {
		return this.submitting;
	}
	@query('rui-form') private ruiForm!: RuiFormElement | null;
	private bound?: BoundForm;
	private releaseForm?: () => void;
	private unwatchValues?: () => void;
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
	private rendererEngine?: CoreFormEngine;
	private reportedMissingEngine = false;

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
		if (!this.bound) this.resetStepState();
		this.connectForm();
	}

	/**
	 * Follows the engine the enclosing renderer publishes, including one bound after this host connected.
	 *
	 * @remarks
	 * An `engine` assigned to this host directly wins: only an unset engine, or one that came
	 * from the renderer, is replaced.
	 */
	@onContextUpdate({ context: formEngineContext, select: (context) => context?.formatIssue, requestUpdate: false })
	onRendererFormatIssue(formatIssue: FormIssueFormatter | undefined): void {
		if (formatIssue === this.rendererFormatIssue) return;
		this.rendererFormatIssue = formatIssue;
		this.refreshIssueText();
	}

	@onContextUpdate({ context: formEngineContext, select: (context) => context?.engine, requestUpdate: false })
	onRendererEngine(engine: CoreFormEngine | undefined): void {
		if (!engine) return;
		if (this.engine === undefined || this.engine === this.rendererEngine) this.engine = engine;
		this.rendererEngine = engine;
	}

	override disconnectedCallback(): void {
		this.navigation.cancel();
		super.disconnectedCallback();
	}

	@onUpdated(['config', 'defaultValues'])
	onConfigUpdated(): void {
		this.resetStepState();
		this.connectForm();
	}

	@onUpdated(['engine'])
	onEngineUpdated(): void {
		this.connectForm();
		this.publish();
	}

	/** The formatter for this form: its renderer's override, else the engine's. */
	private issueFormatter(): FormIssueFormatter | undefined {
		return this.rendererFormatIssue ?? this.engine?.getIssueFormatter();
	}

	/** Shows the text of the new formatter: the form presents issues through it. */
	private refreshIssueText(): void {
		if (this.bound) this.attachForm(this.bound);
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
	 * the form would then validate the later steps too. The capture phase runs before
	 * `rui-form` sees the event.
	 */
	@onEvent({ type: 'submit', host: true, options: { capture: true } })
	onNativeSubmit(event: Event): void {
		this.warnWithoutEngine();
		const { isWizard, currentStep, totalSteps } = this.getContextValue();
		if (isWizard && currentStep < totalSteps - 1) {
			event.preventDefault();
			event.stopPropagation();
			void this.goToNextStep();
		}
	}

	/**
	 * Creates the form's container for the current config, engine and `rui-form`, and hands it to the form.
	 *
	 * @remarks
	 * The container belongs to the instance, not to its connection: moving the element in the document keeps
	 * the values, field state and step state, and the form is rebuilt only when the config, the engine or the
	 * `rui-form` changes. Replacing the config or the engine starts a fresh form with its defaults and step state. A `rui-form` that
	 * has not upgraded yet has no `connect`, so the form is built when its element is defined. A host that is not
	 * connected, as while it is rendered on the server, builds nothing.
	 *
	 * A config that came through server markup is plain data without the engine's normalization (the container
	 * kind of an array does not survive serialization), so the engine normalizes it again before the container
	 * reads its elements. A config the engine already normalized comes back as it is.
	 */
	private connectForm(): void {
		if (!this.isConnected) return;
		const { config, engine, ruiForm } = this;
		if (!config || !engine || !ruiForm) {
			this.releaseBound();
			return;
		}
		const { defaultValues } = this;
		const current = this.bound;
		if (
			current?.config === config &&
			current.engine === engine &&
			current.host === ruiForm &&
			current.defaultValues === defaultValues
		) {
			return;
		}
		if (typeof ruiForm.connect !== 'function') {
			void customElements.whenDefined('rui-form').then(() => this.connectForm());
			return;
		}
		this.releaseBound(true);
		const normalized = engine.safeValidateForm(config);
		if (!normalized.success) {
			logger.error('The form config is not valid for its engine, so the form has no state', normalized.issues);
			this.releaseBound();
			return;
		}
		const elements = flattenStepElements(normalized.data.steps);
		const bound: BoundForm = {
			config,
			engine,
			host: ruiForm,
			defaultValues,
			submission: createSubmissionGuard(),
			container: createFormStateContainer({
				config: normalized.data,
				registry: engine.getValidationRegistry(),
				defaults: collectInitialValues(elements, defaultValues ?? {}),
				snapshot: this.firstForm && this.isServerRendered ? this.hydration : undefined,
			}),
		};
		this.firstForm = false;
		this.bound = bound;
		this.attempts = 0;
		this.resetStepState();
		this.attachForm(bound);
		this.watchValues(bound.container);
		this.syncActions(bound);
		this.publish();
	}

	/** Injects the container into the `rui-form`, replacing the earlier binding, with the handlers of this instance. */
	private attachForm({ host, container }: BoundForm): void {
		this.releaseForm = host.connect(container, {
			formatError: (issue, field) => this.issueFormatter()?.(issue, field) ?? '',
			submitHandler: (context) => this.submitForm(context),
			resetHandler: () => this.resetForm(),
		});
	}

	/**
	 * @param keepForm - Leaves the `rui-form` bound to the old container, for a caller about to `connect` the next one, which replaces the binding without putting the form back on its own store in between.
	 */
	private releaseBound(keepForm = false): void {
		this.unwatchValues?.();
		this.unwatchValues = undefined;
		this.disposeActions();
		if (!keepForm) {
			this.releaseForm?.();
			this.releaseForm = undefined;
		}
		const hadForm = this.bound !== undefined;
		this.bound = undefined;
		if (hadForm) this.publish();
	}

	/**
	 * Runs one submission through the container, and runs the actions and `onSubmit` for the values that passed.
	 *
	 * @remarks
	 * `rui-form` calls this on a submit, after it has synced the controls into the container. The guard
	 * holds from here until the lifecycle ends, so a second submit while the first validates or runs is dropped.
	 * `container.submit()` validates and says how it ended: `passed` carries exactly the values that were
	 * validated, `invalid` focuses the first field with an error, and `overtaken` (an edit, a row move or a
	 * reset outran the check) submits nothing and leaves the user to try again. A validation that could not
	 * run (a validator threw, a service was down) is not a field error: the submission stops, is logged, counts as an attempt
	 * and completes unsuccessfully with the failure as `detail.error`.
	 */
	private async submitForm(context: RuiFormSubmitContext<FormStateError>): Promise<void> {
		const { bound } = this;
		if (!bound) return;
		await bound.submission.run(async () => {
			const { container, host } = bound;
			let result: FormSubmitResult;
			try {
				result = await container.submit();
			} catch (error) {
				if (this.bound !== bound) return;
				this.countAttempt();
				logger.error('Form validation could not run', error);
				host.dispatchEvent(
					new CustomEvent('se-action-submit-complete', {
						bubbles: true,
						composed: true,
						detail: { succeeded: false, results: [], error } satisfies SubmissionCompleteDetail,
					}),
				);
				return;
			}
			if (this.bound !== bound) return;
			if (result.outcome === 'invalid') {
				this.countAttempt();
				host.dispatchEvent(new CustomEvent('se-action-submit-invalid', { bubbles: true, composed: true }));
				const first = this.firstInvalidPath(container.getSnapshot().errors);
				if (first !== undefined) context.focus(first);
				return;
			}
			if (result.outcome === 'passed') await this.completeSubmission(bound, result, context);
		});
	}

	/** The path of the first field, in document order, that has an error; the form's own error is no field. */
	private firstInvalidPath(errors: Readonly<Record<string, FormStateError>>): string | undefined {
		for (const field of this.querySelectorAll('se-field[name], rui-field[name]')) {
			const name = field.getAttribute('name');
			if (name && name !== FORM_ROOT && Object.hasOwn(errors, name)) return name;
		}
		return undefined;
	}

	/**
	 * Reports a submission with `se-action-submit-start` and `se-action-submit-complete` (with `error` when
	 * `onSubmit` rejected or the lifecycle failed) on the `rui-form`, whether or not actions are configured.
	 *
	 * @remarks
	 * With no `onSubmit`, a form with `action` or `method` submits natively after its actions have
	 * completed and succeeded, so the navigation cannot cut off the success and complete actions; the engine's
	 * CSRF token goes into the inner `<form>` first (`csrfFieldFor`: only a same-origin `post`), and a token left
	 * by an earlier post is removed when this one must not carry it. A rejected
	 * `onSubmit` completes the submission as unsuccessful, runs the error and complete actions and is logged,
	 * not rethrown: the event is how the page learns of it.
	 */
	private async completeSubmission(
		{ host, engine }: BoundForm,
		{ values, setServerErrors }: Extract<FormSubmitResult, { outcome: 'passed' }>,
		context: Pick<RuiFormSubmitContext, 'submitNatively'>,
	): Promise<void> {
		const announce = (type: string, detail?: unknown) =>
			host.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
		const submitNatively = () => {
			const form = host.querySelector('form');
			if (form) syncCsrfField(form, csrfFieldFor(engine.getCsrf(), form));
			context.submitNatively();
		};
		this.setSubmitting(true);
		announce('se-action-submit-start');
		const { onSubmit } = this;
		const callback = onSubmit ? () => onSubmit(values, { setServerErrors, fetch: engine.fetch }) : undefined;
		let detail: SubmissionCompleteDetail;
		try {
			if (this.actions) {
				const { succeeded, results, failure } = await this.actions.submit(callback);
				if (succeeded && !callback) submitNatively();
				detail = { succeeded, results, ...(failure ? { error: failure.error } : {}) };
			} else {
				if (callback) await callback();
				else submitNatively();
				detail = { succeeded: true, results: [] };
			}
		} catch (error) {
			detail = { succeeded: false, results: [], error };
		} finally {
			this.setSubmitting(false);
		}
		this.countAttempt();
		if ('error' in detail) logger.error('Form submission failed', detail.error);
		announce('se-action-submit-complete', detail);
	}

	private setSubmitting(submitting: boolean): void {
		this.submitting = submitting;
		this.publish();
	}

	private countAttempt(): void {
		this.attempts += 1;
		this.publish();
	}

	/** Restores the container's defaults, the first step and the attempt count. */
	private resetForm(): void {
		this.bound?.container.reset();
		this.attempts = 0;
		this.resetStepState();
	}

	/**
	 * Builds the actions for the current container, or drops them when the form configures none.
	 *
	 * @remarks
	 * The actions belong to one container, so a new form builds new ones and fires `form_mount` again.
	 */
	private syncActions({ config, engine, container, host }: BoundForm): void {
		this.disposeActions();
		if (!hasConfiguredActions(config)) return;
		this.actions = new FormActions({
			config: () => this.config,
			engine,
			container,
			host,
			currentStep: () => this.currentStep,
			submitCount: () => this.attempts,
			sync: () => host.sync(),
			reset: () => this.resetForm(),
			onAction: (action, data) => this.onAction?.(action, data),
		});
		this.actions.start();
	}

	private disposeActions(): void {
		this.actions?.dispose();
		this.actions = undefined;
	}

	/** Hands the live values to the constraint hosts and calls `onChange` when a value changes. */
	private watchValues(container: FormStateContainer): void {
		this.unwatchValues?.();
		this.publishFormValues(container.getSnapshot().values);
		this.unwatchValues = observeValues(container, (values) => {
			this.publishFormValues(values);
			this.onChange?.(values);
		});
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
			submitCount: this.attempts,
			container: this.bound?.container,
			formatIssue: this.issueFormatter(),
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
	private publishFormValues(values: Readonly<Record<string, unknown>>): void {
		const { config } = this;
		if (!config) return;
		if (this.authoredDisabled?.config !== config) {
			this.authoredDisabled = { config, lookup: createAuthoredDisabledLookup(config) };
		}
		this.valuesProvider.setContext({ values, isAuthoredDisabled: this.authoredDisabled.lookup });
	}

	private publish(): void {
		this.provider.setContext(this.getContextValue());
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'se-form-instance': FormInstanceElement;
	}
}
