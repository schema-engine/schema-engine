import './form-action-controller.css';
import { customElement, prop, RadiantElement, state } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import type { BuilderActionBaseContext, FormActionTrigger, FormConfigView } from '@schema-engine/forms';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import { ActionDispatcher } from '@schema-engine/actions';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { formEngineContext, type FormEngineContextValue } from '@/components/provider';
import { whenEngineAvailable } from '@/contexts/resolve-form-engine';
import { FormController } from '@/adapters/radiant/controller';
import { findAncestorElement } from '@/lib/rui-form-utils';

/** Dispatches configured form actions for Radiant form lifecycle events. */
@customElement('se-form-action-controller')
export class FormActionControllerElement extends RadiantElement {
	@prop({ type: Object }) config!: FormConfigView;
	@state engine?: FormEngine;

	readonly form = new FormController(this);

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
		this.dispatchEvent(new CustomEvent('se-action-submit-start', { bubbles: true, composed: true }));
		await this.dispatch('form_submit_start');
		const results = await this.dispatch('form_submit');
		const succeeded = results.every((result) => result.success || result.shouldContinue !== false);
		await this.dispatch(succeeded ? 'form_submit_success' : 'form_submit_error');
		await this.dispatch('form_submit_complete');
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

		const formState = form.formState;
		return this.dispatcher.dispatch({
			actions: config.actions,
			trigger,
			context: {
				formId: config.id || 'unnamed-form',
				formData: form.getValues(),
				currentStep: this.formInstance?.currentStep ?? 0,
				totalSteps: this.formInstance?.totalSteps ?? config.steps?.length ?? 1,
				isValid: formState.isValid,
				errors: formState.errors,
				metadata: {
					stepStartTime: this.mountedAt,
					totalFormTime: Date.now() - this.mountedAt,
					userInteractions: Object.keys(formState.touched).length,
				},
				form: {
					reset: () => form.reset(),
					setValue: (name, value) => form.setValue(name, value),
					getValue: (name) => form.getValue(name),
					validate: () => form.trigger(),
				},
			},
		});
	}
}

export function FormActionController({ config, engine }: { config: FormConfigView; engine?: FormEngine }) {
	return jsx('se-form-action-controller', {
		config,
		'prop:engine': engine,
	});
}
