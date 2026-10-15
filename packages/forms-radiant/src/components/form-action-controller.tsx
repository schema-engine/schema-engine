import './form-action-controller.css';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import type { BuilderActionBaseContext, FormActionTrigger, FormConfigView } from '@schema-engine/forms';
import { ActionDispatcher } from '@schema-engine/forms/actions';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { FormController, FormEngineController } from '@/adapters/radiant/controller';
import { findAncestorElement } from '@/lib/rui-form-utils';

/** Dispatches configured form actions for Radiant form lifecycle events. */
@customElement('se-form-action-controller')
export class FormActionControllerElement extends RadiantElement {
	@prop({ type: Object }) config!: FormConfigView;

	readonly form = new FormController(this);
	private readonly formEngine = new FormEngineController(this);

	private dispatcher?: ActionDispatcher<BuilderActionBaseContext, FormActionTrigger>;
	private mountedAt = 0;
	private didMount = false;
	private watchingChanges = false;
	private formInstance?: FormInstanceContextValue;

	@onContextUpdate({ context: formInstanceContext, requestUpdate: false })
	onFormInstance(value: FormInstanceContextValue): void {
		this.formInstance = value;
	}

	protected override onConnected(): void {
		this.formEngine.connect(() => {
			this.setupDispatcher();
			this.onFormReady();
		});
		this.form.connect(() => this.onFormReady());
		this.setupDispatcher();
		this.onFormReady();
	}

	override disconnectedCallback(): void {
		this.formEngine.disconnect();
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
		const engine = this.formEngine.engine;
		if (this.dispatcher || !engine || !config?.actions?.length) {
			return;
		}

		const form = findAncestorElement(this, 'rui-form');
		if (!form) {
			return;
		}

		this.dispatcher = new ActionDispatcher(engine);
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

export function FormActionController({ config }: { config: FormConfigView }) {
	return jsx('se-form-action-controller', {
		config,
	});
}
