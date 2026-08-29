import './form-action-controller.css';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import type { FormConfig } from '@schema-engine/forms/schemas';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { BuilderActionBaseContext, FormActionTrigger } from '@schema-engine/forms';
import { ActionDispatcher } from '@schema-engine/actions';
import { findNearestRuiForm } from '@/lib/rui-form-utils';

type RuiFormStore = {
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

function getFormStore(host: HTMLElement): RuiFormStore | null {
	const form = findNearestRuiForm(host);
	const store = form ? Reflect.get(form, 'store') : null;
	if (!store || typeof store !== 'object') {
		return null;
	}

	const requiredMethods = ['getValues', 'getState', 'reset', 'setValue', 'validateAll'];
	return requiredMethods.every((method) => typeof Reflect.get(store, method) === 'function')
		? (store as RuiFormStore)
		: null;
}

/** Dispatches configured form actions for Radiant form lifecycle events. */
@customElement('se-form-action-controller')
export class FormActionControllerElement extends RadiantElement {
	@prop({ type: Object }) config!: FormConfig;
	@prop({ type: Object }) engine?: FormEngine;

	private dispatcher?: ActionDispatcher<BuilderActionBaseContext, FormActionTrigger>;
	private mountedAt = 0;
	private formChangeQueued = false;

	protected override onConnected(): void {
		if (!this.engine || !this.config?.actions?.length) {
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

	override render() {
		return null;
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
		await this.dispatch('form_submit_start');
		const results = await this.dispatch('form_submit');
		const succeeded = results.every((result) => result.success || result.shouldContinue !== false);
		await this.dispatch(succeeded ? 'form_submit_success' : 'form_submit_error');
		await this.dispatch('form_submit_complete');
	}

	private async dispatch(trigger: FormActionTrigger): Promise<Awaited<ReturnType<ActionDispatcher['dispatch']>>> {
		if (!this.dispatcher || !this.config?.actions?.length) {
			return [];
		}

		const store = getFormStore(this);
		if (!store) {
			return [];
		}

		const state = store.getState();
		return this.dispatcher.dispatch({
			actions: this.config.actions,
			trigger,
			context: {
				formId: this.config.id || 'unnamed-form',
				formData: store.getValues(),
				currentStep: 0,
				totalSteps: this.config.steps.length,
				isValid: state.isValid,
				errors: state.errors,
				metadata: {
					stepStartTime: this.mountedAt,
					totalFormTime: Date.now() - this.mountedAt,
					userInteractions: Object.keys(state.touched).length,
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

export function FormActionController({ config, engine }: { config: FormConfig; engine?: FormEngine }) {
	return jsx('se-form-action-controller', { 'prop:config': config, 'prop:engine': engine });
}
