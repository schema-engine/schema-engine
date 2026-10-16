import './form-action-controller.css';
import { customElement, RadiantElement, state } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import type { BuilderActionBaseContext, FormActionTrigger, FormConfigView } from '@schema-engine/forms';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import { runSubmissionLifecycle, buildFormActionContext } from '@schema-engine/forms/engine';
import type { FormProviderProps } from '@/adapters/types';
import { ActionDispatcher } from '@schema-engine/forms/actions';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { formEngineContext, type FormEngineContextValue } from '@/components/provider';
import { whenEngineAvailable } from '@/contexts/resolve-form-engine';
import { FormController } from '@/adapters/radiant/controller';
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
	private mountedAt = 0;
	private didMount = false;
	private watchingChanges = false;
	private formInstance?: FormInstanceContextValue;
	private unsubscribeActiveEngine?: () => void;

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
		const instance = findAncestorElement(this, 'se-form-instance') as FormInstanceElement | undefined;
		if (!this.config && instance?.config) this.config = instance.config;
		if (!this.engine) {
			this.unsubscribeActiveEngine = whenEngineAvailable(this, this.engine, (engine) => {
				if (!this.engine) {
					this.engine = engine;
				}
				this.setupDispatcher();
				this.onFormReady();
			});
		}
		this.form.connect(() => this.onFormReady());
		this.setupDispatcher();
		this.onFormReady();
	}

	override disconnectedCallback(): void {
		this.unsubscribeActiveEngine?.();
		this.form.disconnect();
		this.dispatcher = undefined;
		this.didMount = false;
		this.watchingChanges = false;
		super.disconnectedCallback();
	}

	override render() {
		return null;
	}

	private setupDispatcher(): void {
		const config = this.config;
		if (this.dispatcher || !this.engine || !config?.actions?.length) {
			return;
		}

		const form = findAncestorElement(this, 'rui-form');
		if (!form) {
			return;
		}

		this.dispatcher = new ActionDispatcher(this.engine);
		this.mountedAt = Date.now();

		const onSubmit = () => void this.runSubmissionLifecycle();
		form.addEventListener('rui-submit', onSubmit);
		this.registerCleanupCallback(() => {
			form.removeEventListener('rui-submit', onSubmit);
		});
	}

	private onFormReady(): void {
		if (!this.dispatcher || !this.form.ready) {
			return;
		}
		if (!this.didMount) {
			this.didMount = true;
			void this.dispatch('form_mount');
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
			void this.dispatch('form_change');
		});
	}

	private async runSubmissionLifecycle(): Promise<void> {
		if (!this.dispatcher || !this.form.ready) return;
		this.dispatchEvent(new CustomEvent('se-action-submit-start', { bubbles: true, composed: true }));
		const { succeeded, results } = await runSubmissionLifecycle(
			async (input) => {
				const dispatcher = this.dispatcher;
				if (!dispatcher) return [];
				const dispatchedResults: Awaited<ReturnType<typeof dispatcher.dispatch>> = [];
				for (const action of input.actions) {
					const dispatched = await dispatcher.dispatch({ ...input, actions: [action] });
					if (input.trigger === 'form_submit' && dispatched[0]?.success) {
						try {
							await this.onAction?.(action, input.context.formData);
						} catch (error) {
							dispatched[0] = {
								success: false,
								shouldContinue: false,
								error: error instanceof Error ? error.message : String(error),
							};
						}
					}
					dispatchedResults.push(...dispatched);
					if (dispatched.some((result) => !result.success && result.shouldContinue === false)) break;
				}
				return dispatchedResults;
			},
			{ actions: this.config.actions ?? [], context: () => this.buildContext() },
		);
		this.dispatchEvent(
			new CustomEvent('se-action-submit-complete', {
				bubbles: true,
				composed: true,
				detail: { succeeded, results },
			}),
		);
	}

	private async dispatch(trigger: FormActionTrigger): Promise<Awaited<ReturnType<ActionDispatcher['dispatch']>>> {
		const config = this.config;
		if (!this.dispatcher || !config?.actions?.length) {
			return [];
		}

		const form = this.form;
		if (!form.ready) {
			return [];
		}

		return this.dispatcher.dispatch({ actions: config.actions, trigger, context: this.buildContext() });
	}

	private buildContext(): BuilderActionBaseContext {
		const form = this.form;
		return buildFormActionContext({
			config: this.config,
			values: form.getValues(),
			formState: form.formState,
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
