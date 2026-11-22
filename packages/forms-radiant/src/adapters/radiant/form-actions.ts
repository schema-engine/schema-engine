import type { BuilderActionBaseContext, FormActionTrigger, FormConfigView } from '@schema-engine/forms';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import { buildFormActionContext, collectStepActions, runSubmissionLifecycle } from '@schema-engine/forms/engine';
import { ActionDispatcher, type ActionDispatchInput } from '@schema-engine/forms/actions';
import type { FormActionConfig } from '@schema-engine/forms/schemas';
import type { FormStateContainer } from '@schema-engine/forms/state-container';
import type { FormProviderProps } from '@/adapters/types';
import { logger } from '@/lib/logger';
import { observeValues } from '@/lib/observe-values';

/** What a submission's actions produced, in the shape `runSubmissionLifecycle` resolves. */
export type SubmissionOutcome = Awaited<ReturnType<typeof runSubmissionLifecycle>>;

export interface FormActionsOptions {
	/** Reads the current config on each trigger, so a re-validated equal config does not rebuild the actions. */
	config: () => FormConfigView;
	engine: FormEngine;
	/** The form instance's state container. */
	container: FormStateContainer;
	/** The instance's `rui-form`, which the action results are reported on. */
	host: HTMLElement;
	currentStep: () => number;
	/** Submission attempts so far, which the instance counts. */
	submitCount: () => number;
	/** Writes the controls' values to the container and reports their native validity, as a submit does, before an action's check. */
	sync: () => void;
	/** Resets the whole form instance: values, field state, steps and the attempt count. */
	reset: () => void;
	onAction?: FormProviderProps['onAction'];
}

/**
 * Runs the configured form actions of one form instance.
 *
 * @remarks
 * Built by `se-form-instance` for one state container and discarded with it. It reports through
 * `se-action-results` events on the `rui-form`; the instance reports the submission itself and counts its
 * attempts.
 */
export class FormActions {
	private readonly dispatcher: ActionDispatcher<BuilderActionBaseContext, FormActionTrigger>;
	private readonly mountedAt = Date.now();
	private readonly actionForm: BuilderActionBaseContext['form'];
	private unwatchChanges?: () => void;
	private started = false;

	readonly engine: FormEngine;
	readonly container: FormStateContainer;

	constructor(private readonly options: FormActionsOptions) {
		const { engine, container } = options;
		this.engine = engine;
		this.container = container;
		this.dispatcher = new ActionDispatcher(engine);
		this.actionForm = {
			reset: options.reset,
			setValue: (name, value) => container.setValue(name, value),
			getValue: (name) => container.getValue(name),
			validate: () => {
				options.sync();
				return container.validate();
			},
			checkValidity: () => {
				options.sync();
				return container.checkValidity();
			},
		};
	}

	/**
	 * Dispatches `form_mount` and starts `form_change` dispatching, once.
	 *
	 * @remarks
	 * `form_change` follows a change of the values only: touching a field, recording an error or
	 * counting a submission is no change.
	 */
	start(): void {
		if (this.started) return;
		this.started = true;
		this.dispatchQuietly('form_mount');
		this.unwatchChanges = observeValues(this.container, () => this.dispatchQuietly('form_change'));
	}

	private dispatchQuietly(trigger: FormActionTrigger): void {
		this.dispatchTrigger(trigger).catch((error: unknown) =>
			logger.error(`Form action trigger ${trigger} failed`, error),
		);
	}

	dispose(): void {
		this.unwatchChanges?.();
		this.unwatchChanges = undefined;
	}

	/**
	 * Runs the submission lifecycle, with `onSubmit` between the submit actions and the success or error trigger.
	 *
	 * @remarks The caller reports the submission's start and completion, and counts the attempt.
	 */
	async submit(onSubmit?: () => void | Promise<void>): Promise<SubmissionOutcome> {
		const outcome = await runSubmissionLifecycle((input) => this.dispatchActions(input, true), {
			actions: this.activeActions(),
			context: () => this.buildContext(),
			hasMatching: (actions, trigger) => this.dispatcher.hasMatching(actions, trigger),
			onAction: (action, data) => this.options.onAction?.(action, data),
			onSubmit,
		});
		this.report('form_submit', outcome.results);
		return outcome;
	}

	/** Dispatches one trigger's actions for the current step; resolves empty when none are configured. */
	async dispatchTrigger(trigger: FormActionTrigger): Promise<Awaited<ReturnType<ActionDispatcher['dispatch']>>> {
		const actions = this.activeActions();
		if (!this.dispatcher.hasMatching(actions, trigger)) return [];
		return this.dispatchActions({ actions, trigger, context: this.buildContext() });
	}

	private async dispatchActions(
		input: ActionDispatchInput<FormActionConfig, BuilderActionBaseContext, FormActionTrigger>,
		suppressSubmitReport = false,
	) {
		const results = (await this.dispatcher.dispatch(input)) ?? [];
		if (!(suppressSubmitReport && input.trigger === 'form_submit')) this.report(input.trigger, results);
		return results;
	}

	private report(trigger: FormActionTrigger, results: unknown[]): void {
		if (!results.length) return;
		this.options.host.dispatchEvent(
			new CustomEvent('se-action-results', { bubbles: true, composed: true, detail: { trigger, results } }),
		);
	}

	private activeActions() {
		const config = this.options.config();
		return collectStepActions(config, config.steps[this.options.currentStep()]?.id ?? '');
	}

	/**
	 * @remarks
	 * The container's errors and touched marks are flat by dotted path, as the engine's context is, so
	 * they go in as they are. The attempt count is the instance's.
	 */
	private buildContext(): BuilderActionBaseContext {
		const { container, currentStep, submitCount } = this.options;
		const { values, errors, touched, isValid } = container.getSnapshot();
		const config = this.options.config();
		return buildFormActionContext({
			config,
			values,
			formState: { isValid, errors, touched, submitCount: submitCount() },
			step: { id: config.steps[currentStep()]?.id ?? '', position: currentStep(), total: config.steps.length },
			mountedAt: this.mountedAt,
			form: this.actionForm,
			fetch: this.engine.fetch,
		});
	}
}
