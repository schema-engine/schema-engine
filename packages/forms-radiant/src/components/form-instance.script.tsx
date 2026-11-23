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
import {
	createFormRuntime,
	type FormRuntime,
	type FormSubmissionState,
	type NormalizedFormConfig,
	type SubmissionActionResult,
} from '@schema-engine/forms';
import type { FormEngineRuntime as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormIssueFormatter, FormStateHydration, FormSubmissionIssue } from '@schema-engine/forms/state-container';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { formEngineContext } from '@/components/provider';
import '@ecopages/radiant-ui/form';
import type { RuiFormElement, RuiFormSubmitContext } from '@ecopages/radiant-ui/form';
import { createFormMeta, initialSteps, type FormMeta } from '@/lib/instance-view';
import { logger } from '@/lib/logger';
import { replaceFormData } from '@/lib/native-form-data';
import { csrfFieldFor } from '@schema-engine/forms/csrf';
import { syncCsrfField } from '@/lib/csrf-field';
import type { FormProviderProps, FormSubmitContext } from '@/adapters/types';

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

/**
 * Detail of `se-action-submit-complete`.
 *
 * @remarks `failures` explain an unsuccessful submission (an `onSubmit` that rejected, a failing action or trigger, a validation that could not run) and are empty otherwise; `results` are those of the submit actions.
 */
export interface SubmissionCompleteDetail {
	succeeded: boolean;
	results: readonly SubmissionActionResult[];
	failures: readonly FormSubmissionIssue[];
}

/**
 * The form a `se-form-instance` holds: its runtime and the `rui-form` the runtime's container is injected into.
 *
 * @remarks Identity of the config, engine, `rui-form` and default values decides whether the form is the same: a new one of them is a new form.
 */
interface BoundForm {
	readonly config: NormalizedFormConfig;
	readonly engine: CoreFormEngine;
	readonly host: RuiFormElement;
	readonly defaultValues: Record<string, unknown> | undefined;
	readonly runtime: FormRuntime;
	/** The `rui-form` submit of this form in flight: a form replaced meanwhile keeps its own, so an old one that hangs holds back nothing. */
	readonly inFlight: InFlightSubmit;
}

/** What one form's submission in flight holds: the `rui-form` context whose `submitNatively` the runtime's host reaches, and the results of the submit actions, which `se-action-submit-complete` carries. */
interface InFlightSubmit {
	context?: Pick<RuiFormSubmitContext, 'submitNatively'>;
	results: readonly SubmissionActionResult[];
}

/**
 * Behavior and engine navigation state for one composed form.
 *
 * @remarks
 * The instance creates one runtime per form from the normalized config, the engine and the defaults, and hands the
 * runtime's container to its `rui-form` with `connect`: the form then bridges its controls into the container and
 * presents what the container holds, and the container owns values, validation timing, field state and field
 * arrays. The runtime owns what is around it: the submission, the wizard steps and every action. The instance
 * mounts the runtime on connect and unmounts it on disconnect, provides the runtime's state on its own context
 * and keeps what only an element can do: focus, `rui-form`'s sync, the native submit with its CSRF field, and the
 * `se-action-*` events.
 */
@customElement('se-form-instance')
export class FormInstanceElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: FormInstanceProps;

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
	private rendererFormatIssue?: FormIssueFormatter;
	/** Whether no form has been built yet, so the form to build is the one the server rendered, if it did. */
	private firstForm = true;
	@query('rui-form') private ruiForm!: RuiFormElement | null;
	private bound?: BoundForm;
	private releaseForm?: () => void;
	private unsubscribeRuntime?: () => void;
	private unmountRuntime?: () => void;
	private rendererEngine?: CoreFormEngine;
	private reportedMissingEngine = false;

	@provideContext<typeof formInstanceContext>({
		context: formInstanceContext,
		initialValue: undefined,
		serialize: () => ({}),
	})
	provider!: ContextProvider<typeof formInstanceContext>;

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
		this.connectForm();
		this.resumeWatches();
		this.mountRuntime();
		this.publish();
	}

	/** Watches the runtime and the values again after a disconnect, which stopped them with the runtime's mount. */
	private resumeWatches(): void {
		const { bound } = this;
		if (!bound || this.unsubscribeRuntime) return;
		this.watchRuntime(bound);
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
		this.unmountRuntime?.();
		this.unmountRuntime = undefined;
		this.unsubscribeRuntime?.();
		this.unsubscribeRuntime = undefined;
		super.disconnectedCallback();
	}

	@onUpdated(['config', 'defaultValues'])
	onConfigUpdated(): void {
		this.connectForm();
		this.mountRuntime();
	}

	@onUpdated(['engine'])
	onEngineUpdated(): void {
		this.connectForm();
		this.mountRuntime();
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
	 * Creates the form's runtime for the current config, engine and `rui-form`, and hands its container to the form.
	 *
	 * @remarks
	 * The runtime belongs to the instance, not to its connection: moving the element in the document keeps
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
		const inFlight: InFlightSubmit = { results: [] };
		const runtime = createFormRuntime({
			engine,
			config: normalized.data,
			defaults: defaultValues,
			snapshot: this.firstForm && this.isServerRendered ? this.hydration : undefined,
			host: {
				focus: (paths) => ruiForm.focusField(paths),
				sync: () => ruiForm.sync(),
				submitNatively: (values) => this.submitNatively(engine, ruiForm, inFlight, values),
			},
			onSubmit: (data, helpers) => this.onSubmit?.(data, helpers),
			onChange: (data) => this.onChange?.(data),
			onAction: (action, data) => this.onAction?.(action, data),
			onActionResults: (results, trigger) => this.reportActionResults(ruiForm, inFlight, results, trigger),
		});
		const bound: BoundForm = { config, engine, host: ruiForm, defaultValues, runtime, inFlight };
		this.firstForm = false;
		this.bound = bound;
		this.attachForm(bound);
		this.watchRuntime(bound);
		this.publish();
	}

	/** Starts the runtime of the form, once per connection: `form_mount`, and the watch of the values for `form_change` and `onChange`. */
	private mountRuntime(): void {
		if (!this.isConnected || this.unmountRuntime || !this.bound) return;
		this.unmountRuntime = this.bound.runtime.mount();
	}

	/** Injects the container into the `rui-form`, replacing the earlier binding, with the handlers of this instance. */
	private attachForm({ host, runtime }: BoundForm): void {
		this.releaseForm = host.connect(runtime.container, {
			formatError: (issue, field) => this.issueFormatter()?.(issue, field) ?? '',
			submitHandler: (context) => this.submitForm(context),
			resetHandler: () => runtime.container.reset(),
		});
	}

	/**
	 * @param keepForm - Leaves the `rui-form` bound to the old container, for a caller about to `connect` the next one, which replaces the binding without putting the form back on its own store in between.
	 */
	private releaseBound(keepForm = false): void {
		this.unmountRuntime?.();
		this.unmountRuntime = undefined;
		this.unsubscribeRuntime?.();
		this.unsubscribeRuntime = undefined;
		if (!keepForm) {
			this.releaseForm?.();
			this.releaseForm = undefined;
		}
		const hadForm = this.bound !== undefined;
		this.bound = undefined;
		if (hadForm) this.publish();
	}

	/**
	 * Runs one submission through the runtime and reports how it ended on the `rui-form`.
	 *
	 * @remarks
	 * `rui-form` calls this on a submit, after it has synced the controls into the container. The runtime holds its one
	 * lock from here until the submission ends, so a second submit while the first validates or runs is dropped, and
	 * a submit before the last step of a wizard is a Next. The events follow the status and the outcome:
	 * `se-action-submit-start` when the submission becomes pending, `se-action-submit-invalid` when validation of the
	 * submission found errors (a Next that fails is no submission), and `se-action-submit-complete` when it ended, with `succeeded` and the `failures` the runtime recorded.
	 */
	private async submitForm(context: RuiFormSubmitContext): Promise<void> {
		this.warnWithoutEngine();
		const { bound } = this;
		if (!bound || bound.inFlight.context) return;
		bound.inFlight.context = context;
		bound.inFlight.results = [];
		try {
			const counted = bound.runtime.getSnapshot().submission.submitCount;
			const outcome = await bound.runtime.submit();
			if (this.bound !== bound) return;
			const submitted = bound.runtime.getSnapshot().submission.submitCount > counted;
			if (outcome === 'invalid' && submitted) this.announce(bound.host, 'se-action-submit-invalid');
			const { failures } = bound.runtime.getSnapshot().submission;
			if (outcome === 'submitted' || (outcome === 'failed' && failures.length > 0)) {
				const detail: SubmissionCompleteDetail = {
					succeeded: outcome === 'submitted',
					results: bound.inFlight.results,
					failures,
				};
				this.announce(bound.host, 'se-action-submit-complete', detail);
			}
		} finally {
			if (bound.inFlight.context === context) bound.inFlight.context = undefined;
		}
	}

	private announce(host: HTMLElement, type: string, detail?: unknown): void {
		host.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
	}

	/**
	 * Submits the form natively, with the engine's CSRF token put into the inner `<form>` first.
	 *
	 * @remarks
	 * Only a form without an `onSubmit` posts natively. What is posted is the submission's `values`, not the DOM: a one-shot `formdata` listener replaces the entries, so the config's `payload` travels and a field that took no part (hidden by a constraint, disabled) does not. `csrfFieldFor` gives a token only for a same-origin `post`, and a token left by an earlier post is removed when this one must not carry it.
	 */
	private submitNatively(
		engine: CoreFormEngine,
		host: HTMLElement,
		inFlight: InFlightSubmit,
		values: Readonly<Record<string, unknown>>,
	): void {
		if (this.onSubmit) return;
		const form = host.querySelector('form');
		const csrf = form ? csrfFieldFor(engine.getCsrf(), form) : undefined;
		if (form) syncCsrfField(form, csrf);
		const send = (event: FormDataEvent) => replaceFormData(event.formData, values, csrf ? [csrf] : []);
		form?.addEventListener('formdata', send);
		try {
			inFlight.context?.submitNatively();
		} finally {
			form?.removeEventListener('formdata', send);
		}
	}

	/** Reports the results of a trigger's actions with `se-action-results` on the `rui-form`, and keeps those of the submit actions for `se-action-submit-complete`. */
	private reportActionResults(
		host: HTMLElement,
		inFlight: InFlightSubmit,
		results: readonly SubmissionActionResult[],
		trigger: string,
	): void {
		if (trigger === 'form_submit') inFlight.results = results;
		this.announce(host, 'se-action-results', { trigger, results });
	}

	/** Publishes the instance context when the runtime's state changes, and `se-action-submit-start` when a submission becomes pending. */
	private watchRuntime({ runtime, host }: BoundForm): void {
		this.unsubscribeRuntime?.();
		let seen = runtime.getSnapshot();
		this.unsubscribeRuntime = runtime.subscribe(() => {
			const next = runtime.getSnapshot();
			if (next === seen) return;
			const started = next.submission.status === 'pending' && seen.submission.status !== 'pending';
			seen = next;
			this.publish();
			if (started) this.announce(host, 'se-action-submit-start');
		});
	}

	readonly next = (): ReturnType<FormRuntime['next']> => this.bound?.runtime.next() ?? Promise.resolve('refused');
	readonly back = (): ReturnType<FormRuntime['back']> => this.bound?.runtime.back() ?? Promise.resolve('refused');
	readonly goTo = (id: string): ReturnType<FormRuntime['goTo']> =>
		this.bound?.runtime.goTo(id) ?? Promise.resolve('refused');

	getContextValue(): FormInstanceContextValue {
		const meta = this.meta();
		const snapshot = this.bound?.runtime.getSnapshot();
		const idle: FormSubmissionState = { status: 'idle', failures: [], submitCount: 0 };
		return {
			current: snapshot?.current ?? meta?.steps[0]?.id ?? '',
			steps: snapshot?.steps ?? (meta ? initialSteps(meta) : []),
			navigating: snapshot?.navigating ?? false,
			isWizard: this.config && this.engine ? getViewRecipe(this.engine, this.config)?.kind === 'wizard' : false,
			meta,
			next: this.next,
			back: this.back,
			goTo: this.goTo,
			submission: snapshot?.submission ?? idle,
			container: this.bound?.runtime.container,
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

	private publish(): void {
		this.provider.setContext(this.getContextValue());
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'se-form-instance': FormInstanceElement;
	}
}
