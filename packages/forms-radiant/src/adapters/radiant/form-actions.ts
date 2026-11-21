import type { BuilderActionBaseContext, FormActionTrigger, FormConfigView } from '@schema-engine/forms';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import {
	buildFormActionContext,
	checkFormValidity,
	collectStepActions,
	runSubmissionLifecycle,
} from '@schema-engine/forms/engine';
import { ActionDispatcher, type ActionDispatchInput } from '@schema-engine/forms/actions';
import type { FormActionConfig } from '@schema-engine/forms/schemas';
import type { FormProviderProps } from '@/adapters/types';
import { logger } from '@/lib/logger';
import { createChangeDetector, expandValues } from './controller/values';
import type { FormController } from './controller';

/** What a submission's actions produced, in the shape `runSubmissionLifecycle` resolves. */
export type SubmissionOutcome = Awaited<ReturnType<typeof runSubmissionLifecycle>>;

export interface FormActionsOptions {
	/** Reads the current config on each trigger, so a re-validated equal config does not rebuild the actions. */
	config: () => FormConfigView;
	engine: FormEngine;
	/** The form instance's controller, scoped to its `rui-form`. */
	form: FormController;
	currentStep: () => number;
	onAction?: FormProviderProps['onAction'];
}

/**
 * Runs the configured form actions of one form instance.
 *
 * @remarks
 * Built by `se-form-instance` for one engine and discarded with it; the config
 * is read through a getter, so the actions outlive a config change. It reports
 * through `se-action-results` events on the `rui-form`; the instance reports the
 * submission itself.
 */
export class FormActions {
	private readonly dispatcher: ActionDispatcher<BuilderActionBaseContext, FormActionTrigger>;
	private readonly mountedAt = Date.now();
	private readonly actionForm: BuilderActionBaseContext['form'];
	private unwatchChanges?: () => void;
	private started = false;
	private submitAttempts = 0;
	private readonly countInvalid = () => {
		this.submitAttempts += 1;
	};

	readonly engine: FormEngine;

	constructor(private readonly options: FormActionsOptions) {
		const { engine, form } = options;
		this.engine = engine;
		this.dispatcher = new ActionDispatcher(engine);
		this.actionForm = {
			reset: () => form.reset(),
			setValue: (name, value) => form.setValue(name, value),
			getValue: (name) => form.getValue(name),
			validate: () => form.trigger(),
			checkValidity: () =>
				checkFormValidity({
					steps: options.config().steps,
					values: form.getValues(),
					registry: engine.getValidationRegistry(),
				}),
		};
		form.host.addEventListener('rui-invalid', this.countInvalid);
	}

	/**
	 * Dispatches `form_mount` and starts `form_change` dispatching, once, when the form is ready.
	 *
	 * @remarks
	 * Safe to call on every readiness notification. The change watcher takes its initial
	 * snapshot as the baseline and dispatches `form_change` only when the values differ from
	 * the previous one; it also clears the attempt count when the form is not submitted.
	 */
	start(): void {
		const { form } = this.options;
		if (this.started || !form.ready) return;
		this.started = true;
		this.dispatchQuietly('form_mount');
		const changed = createChangeDetector();
		this.unwatchChanges = form.watchForm((values) => {
			if (!form.formState.isSubmitted) this.submitAttempts = 0;
			if (changed(values)) this.dispatchQuietly('form_change');
		});
	}

	private dispatchQuietly(trigger: FormActionTrigger): void {
		this.dispatchTrigger(trigger).catch((error: unknown) =>
			logger.error(`Form action trigger ${trigger} failed`, error),
		);
	}

	dispose(): void {
		this.options.form.host.removeEventListener('rui-invalid', this.countInvalid);
		this.unwatchChanges?.();
		this.unwatchChanges = undefined;
	}

	/**
	 * Runs the submission lifecycle, with `onSubmit` between the submit actions and the success or error trigger.
	 *
	 * @remarks
	 * Resolves unsuccessful, without calling `onSubmit`, when the form is not ready. The caller reports the
	 * submission's start and completion.
	 */
	async submit(onSubmit?: () => void | Promise<void>): Promise<SubmissionOutcome> {
		if (!this.options.form.ready) return { succeeded: false, results: [] };
		try {
			const outcome = await runSubmissionLifecycle((input) => this.dispatchActions(input, true), {
				actions: this.activeActions(),
				context: () => this.buildContext(),
				hasMatching: (actions, trigger) => this.dispatcher.hasMatching(actions, trigger),
				onAction: (action, data) => this.options.onAction?.(action, data),
				onSubmit,
			});
			this.report('form_submit', outcome.results);
			return outcome;
		} finally {
			this.submitAttempts += 1;
		}
	}

	/** Dispatches one trigger's actions for the current step; resolves empty when none are configured or before the form is ready. */
	async dispatchTrigger(trigger: FormActionTrigger): Promise<Awaited<ReturnType<ActionDispatcher['dispatch']>>> {
		const actions = this.activeActions();
		if (!this.options.form.ready || !this.dispatcher.hasMatching(actions, trigger)) return [];
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
		this.options.form.host.dispatchEvent(
			new CustomEvent('se-action-results', { bubbles: true, composed: true, detail: { trigger, results } }),
		);
	}

	private activeActions() {
		return collectStepActions(this.options.config(), this.options.currentStep());
	}

	/**
	 * @remarks
	 * Radiant UI keys errors and touched state by flat field name, as the engine's flat
	 * errors are; touched state is expanded into the engine's nested tree. The store records only whether the form was
	 * submitted, so `submitCount` counts the attempts Radiant UI reports instead:
	 * `rui-invalid` for one that failed validation, and a finished submission
	 * lifecycle, which is when React Hook Form counts it too.
	 * A reset clears the store's submitted flag and notifies the store, and the
	 * change watcher then clears the count.
	 */
	private buildContext(): BuilderActionBaseContext {
		const { form, currentStep } = this.options;
		const { errors, touched } = form.formState;
		return buildFormActionContext({
			config: this.options.config(),
			values: form.getValues(),
			formState: {
				errors,
				touched: expandValues(touched),
				submitCount: this.submitAttempts,
			},
			currentStep: currentStep(),
			mountedAt: this.mountedAt,
			form: this.actionForm,
		});
	}
}
