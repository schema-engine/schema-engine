import './form-action-controller.css';
import { customElement, prop, RadiantElement, state } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import type { BuilderActionBaseContext, FormActionTrigger, FormConfigView } from '@schema-engine/forms';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import { ActionDispatcher } from '@schema-engine/actions';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { formEngineContext, type FormEngineContextValue } from '@/components/provider';
import { onActiveEngineChange } from '@/registries/active-engine';
import { findNearestRuiForm, readRuiFormStore } from '@/lib/rui-form-utils';

type ActionFormStore = {
	getValues: () => Record<string, unknown>;
	getState: () => {
		isValid: boolean;
		errors: Record<string, unknown>;
		touched: Record<string, boolean>;
	};
	reset: () => void;
	setValue: (name: string, value: unknown) => void;
	validateAll: () => Promise<boolean>;
};

const ACTION_STORE_METHODS = ['getValues', 'getState', 'reset', 'setValue', 'validateAll'] as const;

/** Dispatches configured form actions for Radiant form lifecycle events. */
@customElement('se-form-action-controller')
export class FormActionControllerElement extends RadiantElement {
	@prop({ type: Object }) config!: FormConfigView;
	@state engine?: FormEngine;

	private dispatcher?: ActionDispatcher<BuilderActionBaseContext, FormActionTrigger>;
	private mountedAt = 0;
	private formChangeQueued = false;
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
		}
	}

	protected override onConnected(): void {
		if (!this.engine) {
			this.unsubscribeActiveEngine = onActiveEngineChange((engine) => {
				if (!this.engine) {
					this.engine = engine;
				}
				this.setupDispatcher();
			});
		}
		this.setupDispatcher();
	}

	override disconnectedCallback(): void {
		this.unsubscribeActiveEngine?.();
		super.disconnectedCallback();
	}

	override render() {
		return null;
	}

	private resolveConfig(): FormConfigView | undefined {
		if (this.config) {
			return this.config;
		}
		const raw = this.getAttribute('data-config');
		if (raw) {
			try {
				this.config = JSON.parse(raw);
				return this.config;
			} catch {
				return undefined;
			}
		}
		return undefined;
	}

	private setupDispatcher(): void {
		const config = this.resolveConfig();
		if (this.dispatcher || !this.engine || !config?.actions?.length) {
			return;
		}

		this.dispatcher = new ActionDispatcher(this.engine);
		this.mountedAt = Date.now();

		const form = findNearestRuiForm(this);
		if (!form) {
			return;
		}

		const onChange = () => this.queueFormChange();
		const onSubmit = () => void this.runSubmissionLifecycle();
		form.addEventListener('input', onChange);
		form.addEventListener('change', onChange);
		form.addEventListener('rui-change', onChange);
		form.addEventListener('rui-submit', onSubmit);
		this.registerCleanupCallback(() => {
			form.removeEventListener('input', onChange);
			form.removeEventListener('change', onChange);
			form.removeEventListener('rui-change', onChange);
			form.removeEventListener('rui-submit', onSubmit);
		});

		queueMicrotask(() => void this.dispatch('form_mount'));
	}

	private queueFormChange(): void {
		if (this.formChangeQueued) {
			return;
		}
		this.formChangeQueued = true;
		queueMicrotask(() => {
			this.formChangeQueued = false;
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
		const config = this.resolveConfig();
		if (!this.dispatcher || !config?.actions?.length) {
			return [];
		}

		const store = readRuiFormStore<ActionFormStore>(this, ACTION_STORE_METHODS);
		if (!store) {
			return [];
		}

		const formState = store.getState();
		return this.dispatcher.dispatch({
			actions: config.actions,
			trigger,
			context: {
				formId: config.id || 'unnamed-form',
				formData: store.getValues(),
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
					reset: () => store.reset(),
					setValue: (name, value) => store.setValue(name, value),
					getValue: (name) => store.getValues()[name],
					validate: () => store.validateAll(),
				},
			},
		});
	}
}

export function FormActionController({ config, engine }: { config: FormConfigView; engine?: FormEngine }) {
	return jsx('se-form-action-controller', {
		'prop:config': config,
		'prop:engine': engine,
		'data-config': JSON.stringify(config),
	});
}
