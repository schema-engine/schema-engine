import './form-action-controller.css';
import { customElement, onUpdated, RadiantElement, state } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import type { BuilderActionBaseContext, FormActionTrigger, FormConfigView } from '@schema-engine/forms';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import {
	runSubmissionLifecycle,
	buildFormActionContext,
	collectStepActions,
	hasConfiguredActions,
} from '@schema-engine/forms/engine';
import type { FormProviderProps } from '@/adapters/types';
import { ActionDispatcher } from '@schema-engine/forms/actions';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { formEngineContext, type FormEngineContextValue } from '@/components/provider';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { FormController } from '@/adapters/radiant/controller';
import { expandValues } from '@/adapters/radiant/controller/values';
import type { FormInstanceElement } from './form-instance.script';
import { findAncestorElement } from '@/lib/rui-form-utils';

/** Dispatches configured form actions for Radiant form lifecycle events. */
@customElement('se-form-action-controller')
export class FormActionControllerElement extends RadiantElement {
	@state config!: FormConfigView;
	@state engine?: FormEngine;
	@state onAction?: FormProviderProps['onAction'];

	readonly form = new FormController(this);
	private readonly actionForm = {
		reset: () => this.form.reset(),
		setValue: (name: string, value: unknown) => this.form.setValue(name, value),
		getValue: (name: string) => this.form.getValue(name),
		validate: () => this.form.trigger(),
	};

	private dispatcher?: ActionDispatcher<BuilderActionBaseContext, FormActionTrigger>;
	private dispatcherEngine?: FormEngine;
	private submissionPromise?: Promise<boolean>;
	private mountedAt = 0;
	private mountedEngine?: FormEngine;
	private watchingChanges = false;
	private formInstance?: FormInstanceContextValue;

	@onContextUpdate({ context: formInstanceContext, requestUpdate: false })
	onFormInstance(value: FormInstanceContextValue): void {
		this.formInstance = value;
	}

	@onContextUpdate({ context: formEngineContext, requestUpdate: false })
	onFormEngine(value: FormEngineContextValue): void {
		if (value.engine && !this.engine) {
			this.engine = value.engine;
			this.setupDispatcher();
			this.onFormReady();
		}
	}

	protected override onConnected(): void {
		const form = findAncestorElement(this, 'rui-form');
		if (form) {
			const onSubmit = () => void this.submit();
			form.addEventListener('rui-submit', onSubmit);
			this.registerCleanupCallback(() => form.removeEventListener('rui-submit', onSubmit));
		}
		const instance = findAncestorElement(this, 'se-form-instance') as FormInstanceElement | undefined;
		if (!this.config && instance?.config) this.config = instance.config;
		if (!this.engine) {
			this.engine = resolveFormEngine(this);
		}
		this.form.connect(() => this.onFormReady());
		this.setupDispatcher();
		this.onFormReady();
	}

	@onUpdated(['config', 'engine'])
	onActionConfigurationUpdated(): void {
		this.setupDispatcher();
		this.onFormReady();
	}

	override disconnectedCallback(): void {
		this.form.disconnect();
		this.dispatcher = undefined;
		this.dispatcherEngine = undefined;
		this.submissionPromise = undefined;
		this.mountedEngine = undefined;
		this.watchingChanges = false;
		super.disconnectedCallback();
	}

	override render() {
		return null;
	}

	private setupDispatcher(): void {
		const config = this.config;
		const engine = this.engine;
		if (!engine || !config || !hasConfiguredActions(config)) {
			this.dispatcher = undefined;
			this.dispatcherEngine = undefined;
			return;
		}
		if (this.dispatcherEngine === engine) {
			return;
		}

		const form = findAncestorElement(this, 'rui-form');
		if (!form) {
			return;
		}

		this.dispatcher = new ActionDispatcher(engine);
		this.dispatcherEngine = engine;
		this.mountedAt = Date.now();
	}

	private onFormReady(): void {
		if (!this.dispatcher || !this.form.ready) {
			return;
		}
		if (this.mountedEngine !== this.dispatcherEngine) {
			this.mountedEngine = this.dispatcherEngine;
			void this.dispatchTrigger('form_mount');
		}
		if (this.watchingChanges) {
			return;
		}
		this.watchingChanges = true;
		let initial = true;
		this.form.watchForm(() => {
			if (initial) {
				initial = false;
				return;
			}
			void this.dispatchTrigger('form_change');
		});
	}

	/** Runs submit actions before the form instance invokes its submission callback. */
	submit(): Promise<boolean> {
		if (this.submissionPromise) return this.submissionPromise;
		this.setupDispatcher();
		if (!this.dispatcher || !this.form.ready) return Promise.resolve(false);
		this.dispatchEvent(new CustomEvent('se-action-submit-start', { bubbles: true, composed: true }));
		const submission = runSubmissionLifecycle((input) => this.dispatcher?.dispatch(input) ?? Promise.resolve([]), {
			actions: this.activeActions(),
			context: () => this.buildContext(),
			onAction: (action, data) => this.onAction?.(action, data),
		}).then(({ succeeded, results }) => {
			this.dispatchEvent(
				new CustomEvent('se-action-submit-complete', {
					bubbles: true,
					composed: true,
					detail: { succeeded, results },
				}),
			);
			return succeeded;
		});
		this.submissionPromise = submission;
		void submission.then(
			() => {
				if (this.submissionPromise === submission) this.submissionPromise = undefined;
			},
			() => {
				if (this.submissionPromise === submission) this.submissionPromise = undefined;
			},
		);
		return submission;
	}

	/** Dispatches one trigger's actions for the current step; resolves empty when none are configured or before the dispatcher and form are ready. */
	async dispatchTrigger(trigger: FormActionTrigger): Promise<Awaited<ReturnType<ActionDispatcher['dispatch']>>> {
		const actions = this.activeActions();
		if (!this.dispatcher || !actions.length) {
			return [];
		}

		const form = this.form;
		if (!form.ready) {
			return [];
		}

		return this.dispatcher.dispatch({ actions, trigger, context: this.buildContext() });
	}

	private activeActions() {
		return this.config ? collectStepActions(this.config, this.formInstance?.currentStep ?? 0) : [];
	}

	/**
	 * @remarks
	 * Radiant UI keys errors and touched state by flat field name; both are expanded
	 * into the engine's nested tree. The store records only whether the form was
	 * submitted, so `submitCount` is at most one.
	 */
	private buildContext(): BuilderActionBaseContext {
		const form = this.form;
		const { isValid, errors, touched, isSubmitted } = form.formState;
		return buildFormActionContext({
			config: this.config,
			values: form.getValues(),
			formState: {
				isValid,
				errors: expandValues(errors),
				touched: expandValues(touched),
				submitCount: Number(isSubmitted),
			},
			currentStep: this.formInstance?.currentStep ?? 0,
			mountedAt: this.mountedAt,
			form: this.actionForm,
		});
	}
}

export function FormActionController({
	config,
	engine,
	onAction,
}: {
	config: FormConfigView;
	engine?: FormEngine;
	onAction?: FormProviderProps['onAction'];
}) {
	return jsx('se-form-action-controller', {
		'prop:config': config,
		'prop:engine': engine,
		'prop:onAction': onAction,
	});
}
